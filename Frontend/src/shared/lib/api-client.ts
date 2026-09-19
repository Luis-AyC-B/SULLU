import axios from 'axios';
import { getSession } from 'next-auth/react';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  const sessionData = session as unknown as {
    accessToken?: string;
    user?: { accessToken?: string };
  };

  const token = sessionData?.accessToken || sessionData?.user?.accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});