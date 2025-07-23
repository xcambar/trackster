"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseQueue = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
var environment_1 = require("../environment");
var test = {
    error: null,
    count: null,
    status: 123,
    statusText: "yeah",
    data: [],
};
console.log((_a = test.data) === null || _a === void 0 ? void 0 : _a[0].message.hello);
var SupabaseQueue = /** @class */ (function () {
    function SupabaseQueue(_a) {
        var _b = _a.schema, schema = _b === void 0 ? "pgmq_public" : _b, queue = _a.queue, supabaseUrl = _a.supabaseUrl, supabaseAnonKey = _a.supabaseKey, client = _a.client;
        var _c;
        (_c = this.schema) !== null && _c !== void 0 ? _c : (this.schema = schema);
        this.queue = queue;
        if (!this.queue) {
            throw new Error("The name of the queue is mandatory");
        }
        if (client) {
            this.client = client;
        }
        else {
            if (supabaseUrl && supabaseAnonKey) {
                this.client = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
            }
            else {
                this.client = (0, supabase_js_1.createClient)((0, environment_1.getEnvironment)("SUPABASE_URL"), (0, environment_1.getEnvironment)("SUPABASE_ANON_KEY"));
            }
        }
    }
    SupabaseQueue.prototype.push = function (
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    message, 
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.client.schema(this.schema).rpc("send", __assign(__assign({ queue_name: this.queue }, options), { message: message }))];
            });
        });
    };
    SupabaseQueue.prototype.pull = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.client.schema(this.schema).rpc("pop", {
                        queue_name: this.queue,
                    })];
            });
        });
    };
    return SupabaseQueue;
}());
exports.SupabaseQueue = SupabaseQueue;
