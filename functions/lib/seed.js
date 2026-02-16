"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Seed script for initial Firestore configuration.
 * Run after deploying: npx ts-node src/seed.ts
 */
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
async function seed() {
    console.log('Seeding Firestore config...');
    // App settings
    await db.doc('config/settings').set({
        erbocesPerStudentCost: 11380,
        currentSchoolYear: '2025-26',
        availableYears: ['2023-24', '2024-25', '2025-26'],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('  config/settings created');
    // Airtable base configs
    await db.doc('config/airtable').set({
        bases: [
            {
                baseId: 'appnol2rxwLMp4WfV',
                schoolYears: ['2025-26', '2026-27'],
                attendanceMode: 'absence',
                tables: {
                    students: 'Students',
                    enrollment: 'Student Truth',
                    campuses: 'Truth',
                    classes: 'Classes',
                    attendance: 'Absent',
                },
            },
            {
                baseId: 'appQpRPypqTqk6emb',
                schoolYears: ['2023-24', '2024-25'],
                attendanceMode: 'presence',
                tables: {
                    students: 'Students',
                    enrollment: 'Student Truth',
                    campuses: 'Truth',
                    classes: 'Classes',
                    attendance: 'Attendance',
                },
            },
        ],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('  config/airtable created');
    // Allowed users (seed with admin user)
    await db.doc('config/allowedUsers').set({
        users: [
            {
                email: 'jedwards@che.school',
                isAdmin: true,
                addedAt: new Date().toISOString(),
            },
        ],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('  config/allowedUsers created');
    console.log('Seeding complete.');
    process.exit(0);
}
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map