import axios from "axios";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30_000,
});
