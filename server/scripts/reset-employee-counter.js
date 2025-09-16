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
var mongoose_1 = __importDefault(require("mongoose"));
var dotenv_1 = __importDefault(require("dotenv"));
var Colaborador_1 = __importDefault(require("../src/models/Colaborador"));
var Counter_1 = __importDefault(require("../src/models/Counter"));
dotenv_1.default.config();
function resetEmployeeCounter() {
    return __awaiter(this, void 0, void 0, function () {
        var maxEmployee, startValue, colaboradores, i, newId, oldId, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    // Conectar a MongoDB
                    return [4 /*yield*/, mongoose_1.default.connect(process.env.MONGO_URI || "")];
                case 1:
                    // Conectar a MongoDB
                    _a.sent();
                    console.log('Conectado a MongoDB');
                    return [4 /*yield*/, Colaborador_1.default.findOne().sort({ numeroEmpleado: -1 })];
                case 2:
                    maxEmployee = _a.sent();
                    startValue = maxEmployee ? maxEmployee.numeroEmpleado : 45;
                    // Actualizar el contador al valor más alto actual
                    return [4 /*yield*/, Counter_1.default.findOneAndUpdate({ _id: 'empleadoId' }, { sequence_value: startValue }, { upsert: true })];
                case 3:
                    // Actualizar el contador al valor más alto actual
                    _a.sent();
                    console.log("Contador actualizado al \u00FAltimo n\u00FAmero utilizado: ".concat(startValue));
                    return [4 /*yield*/, Colaborador_1.default.find().sort({ createdAt: 1 })];
                case 4:
                    colaboradores = _a.sent();
                    console.log("Encontrados ".concat(colaboradores.length, " colaboradores para actualizar"));
                    i = 0;
                    _a.label = 5;
                case 5:
                    if (!(i < colaboradores.length)) return [3 /*break*/, 8];
                    newId = i + 46;
                    oldId = colaboradores[i].numeroEmpleado;
                    return [4 /*yield*/, Colaborador_1.default.findByIdAndUpdate(colaboradores[i]._id, { numeroEmpleado: newId })];
                case 6:
                    _a.sent();
                    console.log("Actualizado colaborador: ".concat(oldId, " -> ").concat(newId));
                    _a.label = 7;
                case 7:
                    i++;
                    return [3 /*break*/, 5];
                case 8:
                    console.log('Actualización completada');
                    process.exit(0);
                    return [3 /*break*/, 10];
                case 9:
                    error_1 = _a.sent();
                    console.error('Error:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
resetEmployeeCounter();
