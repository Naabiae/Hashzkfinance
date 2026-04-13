// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interface to interact with our Identity Registry
interface IIdentityRegistry {
    function getUserRole(address user) external view returns (uint256);
}

/**
 * @title P2PEscrow
 * @dev Handles the crypto-to-fiat offramp logic.
 * A Merchant (Role 1) creates an order and locks their USDC.
 * A P2P Agent (Role 2) accepts the order and sends fiat off-chain.
 * The Merchant confirms receipt and releases the locked USDC to the Agent.
 * The admin can resolve disputes for locked orders.
 */
contract P2PEscrow is Ownable {
    using SafeERC20 for IERC20;

    IIdentityRegistry public immutable identityRegistry;
    IERC20 public immutable usdcToken;

    enum OrderStatus { NonExistent, Open, Locked, Completed, Cancelled, Disputed }

    struct Order {
        uint256 id;
        address merchant;
        address agent;
        uint256 amount;
        OrderStatus status;
    }

    mapping(uint256 => Order) public orders;
    uint256 public nextOrderId;

    event OrderCreated(uint256 indexed orderId, address indexed merchant, uint256 amount);
    event OrderAccepted(uint256 indexed orderId, address indexed agent);
    event OrderCompleted(uint256 indexed orderId, address indexed merchant, address indexed agent, uint256 amount);
    event OrderCancelled(uint256 indexed orderId, address indexed merchant, uint256 amount);
    event OrderDisputed(uint256 indexed orderId, address indexed admin, address resolvedTo, uint256 amount);

    constructor(address _identityRegistry, address _usdcToken) Ownable(msg.sender) {
        identityRegistry = IIdentityRegistry(_identityRegistry);
        usdcToken = IERC20(_usdcToken);
    }

    /**
     * @dev Creates a sell order. Only verified Merchants (Role 1 or 3) can do this.
     * @param amount The amount of USDC to lock in escrow.
     */
    function createOrder(uint256 amount) external returns (uint256) {
        uint256 role = identityRegistry.getUserRole(msg.sender);
        require(role == 1 || role == 3, "Only verified Merchants can create orders");
        require(amount > 0, "Amount must be greater than 0");

        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            merchant: msg.sender,
            agent: address(0),
            amount: amount,
            status: OrderStatus.Open
        });

        usdcToken.safeTransferFrom(msg.sender, address(this), amount);

        emit OrderCreated(orderId, msg.sender, amount);
        return orderId;
    }

    /**
     * @dev Accepts an open order. Only verified Agents (Role 2 or 3) can do this.
     * @param orderId The ID of the order to accept.
     */
    function acceptOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Open, "Order is not Open");
        require(order.merchant != address(0), "Order does not exist");
        
        uint256 role = identityRegistry.getUserRole(msg.sender);
        require(role == 2 || role == 3, "Only verified Agents can accept orders");
        require(msg.sender != order.merchant, "Merchant cannot accept their own order");

        order.agent = msg.sender;
        order.status = OrderStatus.Locked;

        emit OrderAccepted(orderId, msg.sender);
    }

    /**
     * @dev Releases the locked funds to the Agent. Only the Merchant can call this after receiving fiat.
     * @param orderId The ID of the order to release.
     */
    function releaseFunds(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Locked, "Order is not locked");
        require(msg.sender == order.merchant, "Only the Merchant can release funds");

        order.status = OrderStatus.Completed;

        // Transfer the locked USDC to the Agent
        usdcToken.safeTransfer(order.agent, order.amount);

        emit OrderCompleted(orderId, msg.sender, order.agent, order.amount);
    }

    /**
     * @dev Cancels an open order and refunds the Merchant. Only the Merchant can call this.
     * @param orderId The ID of the order to cancel.
     */
    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.merchant == msg.sender, "Only the Merchant can cancel the order");
        require(order.status == OrderStatus.Open, "Order cannot be cancelled now");

        order.status = OrderStatus.Cancelled;

        usdcToken.safeTransfer(order.merchant, order.amount);

        emit OrderCancelled(orderId, msg.sender, order.amount);
    }

    /**
     * @dev Resolves a disputed locked order. Only the contract owner (admin) can call this.
     * @param orderId The ID of the locked order.
     * @param resolveTo The address (either merchant or agent) to send the locked USDC.
     */
    function resolveDispute(uint256 orderId, address resolveTo) external onlyOwner {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Locked, "Order must be Locked to dispute");
        require(resolveTo == order.merchant || resolveTo == order.agent, "Can only resolve to merchant or agent");

        order.status = OrderStatus.Disputed;

        usdcToken.safeTransfer(resolveTo, order.amount);

        emit OrderDisputed(orderId, msg.sender, resolveTo, order.amount);
    }
}