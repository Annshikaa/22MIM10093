"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Log = void 0;
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("./auth");
const Log = async (stack, level, pkg, message) => {
    try {
        const token = await (0, auth_1.getAuthToken)();
        await axios_1.default.post('http://4.224.186.213/evaluation-service/logs', { stack, level, package: pkg, message }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`[${level}] [${stack}/${pkg}] ${message}`);
    }
    catch (err) {
        console.error('[logger] failed to push log:', err);
    }
};
exports.Log = Log;
