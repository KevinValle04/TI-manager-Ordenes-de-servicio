"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRazonSocial = exports.updateRazonSocial = exports.createRazonSocial = exports.getRazonSocialByRfc = exports.getRazonSocialById = exports.getRazonesSociales = void 0;
var RazonSocial_1 = __importDefault(require("../models/RazonSocial"));
var getRazonesSociales = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var razonesSociales, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, RazonSocial_1.default.find()];
            case 1:
                razonesSociales = _a.sent();
                res.json(razonesSociales);
                return [3 /*break*/, 3];
            case 2:
                err_1 = _a.sent();
                res.status(500).json({ error: 'Error al obtener razones sociales' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getRazonesSociales = getRazonesSociales;
var getRazonSocialById = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var razonSocial, err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, RazonSocial_1.default.findById(req.params.id)];
            case 1:
                razonSocial = _a.sent();
                if (!razonSocial) {
                    return [2 /*return*/, res.status(404).json({ error: 'Razón social no encontrada' })];
                }
                res.json(razonSocial);
                return [3 /*break*/, 3];
            case 2:
                err_2 = _a.sent();
                res.status(500).json({ error: 'Error al obtener razón social' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getRazonSocialById = getRazonSocialById;
var getRazonSocialByRfc = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var razonSocial, err_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, RazonSocial_1.default.findOne({ rfc: req.params.rfc })];
            case 1:
                razonSocial = _a.sent();
                if (!razonSocial) {
                    return [2 /*return*/, res.status(404).json({ error: 'Razón social no encontrada' })];
                }
                res.json(razonSocial);
                return [3 /*break*/, 3];
            case 2:
                err_3 = _a.sent();
                res.status(500).json({ error: 'Error al obtener razón social' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getRazonSocialByRfc = getRazonSocialByRfc;
var createRazonSocial = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var razonSocial, err_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                razonSocial = new RazonSocial_1.default(req.body);
                return [4 /*yield*/, razonSocial.save()];
            case 1:
                _a.sent();
                res.status(201).json(razonSocial);
                return [3 /*break*/, 3];
            case 2:
                err_4 = _a.sent();
                if (err_4.code === 11000) {
                    res.status(400).json({ error: 'Ya existe una razón social con este RFC' });
                }
                else {
                    res.status(400).json({ error: 'Error al crear razón social' });
                }
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.createRazonSocial = createRazonSocial;
var updateRazonSocial = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var razonSocial, err_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, RazonSocial_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true })];
            case 1:
                razonSocial = _a.sent();
                if (!razonSocial) {
                    return [2 /*return*/, res.status(404).json({ error: 'Razón social no encontrada' })];
                }
                res.json(razonSocial);
                return [3 /*break*/, 3];
            case 2:
                err_5 = _a.sent();
                if (err_5.code === 11000) {
                    res.status(400).json({ error: 'Ya existe una razón social con este RFC' });
                }
                else {
                    res.status(400).json({ error: 'Error al actualizar razón social' });
                }
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.updateRazonSocial = updateRazonSocial;
var deleteRazonSocial = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var razonSocial, err_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, RazonSocial_1.default.findByIdAndDelete(req.params.id)];
            case 1:
                razonSocial = _a.sent();
                if (!razonSocial) {
                    return [2 /*return*/, res.status(404).json({ error: 'Razón social no encontrada' })];
                }
                res.json({ message: 'Razón social eliminada exitosamente' });
                return [3 /*break*/, 3];
            case 2:
                err_6 = _a.sent();
                res.status(400).json({ error: 'Error al eliminar razón social' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.deleteRazonSocial = deleteRazonSocial;
