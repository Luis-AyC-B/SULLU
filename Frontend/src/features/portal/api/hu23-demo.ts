import { getSession } from 'next-auth/react';
export const HU23_API='http://127.0.0.1:3003/demo/hu23';
export const isDemoToken=(token?:string)=>!!token?.startsWith('hu23-demo:');
export async function isHu23Demo(){try{return isDemoToken((await getSession())?.user?.accessToken);}catch{return false;}}
