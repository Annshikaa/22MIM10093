import axios from 'axios';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export const getAuthToken = async (): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && now < tokenExpiry - 60) {
    return cachedToken;
  }

  const res = await axios.post('http://4.224.186.213/evaluation-service/auth', {
    email: 'anshikajain7566@gmail.com',
    name: 'anshika jain',
    rollNo: '22mim10093',
    accessCode: 'SfFuWg',
    clientID: 'e7bc7aea-0988-43ac-b7f0-6732ac264f10',
    clientSecret: 'dCsWsUfbUtcsWtzy'
  });

  cachedToken = res.data.access_token;
  tokenExpiry = res.data.expires_in;
  return cachedToken as string;
};