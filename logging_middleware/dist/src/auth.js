"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthToken = void 0;
const axios_1 = __importDefault(require("axios"));
let cachedToken = null;
let tokenExpiry = 0;
const getAuthToken = async () => {
    const now = Math.floor(Date.now() / 1000);
    if (cachedToken && now < tokenExpiry - 60) {
        return cachedToken;
    }
    const res = await axios_1.default.post('http://4.224.186.213/evaluation-service/auth', {
        email: 'anshikajain7566@gmail.com',
        name: 'anshika jain',
        rollNo: '22mim10093',
        accessCode: 'SfFuWg',
        clientID: 'e7bc7aea-0988-43ac-b7f0-6732ac264f10',
        clientSecret: 'dCsWsUfbUtcsWtzy'
    });
    cachedToken = res.data.access_token;
    tokenExpiry = res.data.expires_in;
    return cachedToken;
};
exports.getAuthToken = getAuthToken;
