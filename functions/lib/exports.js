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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePDFReport = generatePDFReport;
exports.generateCSVExport = generateCSVExport;
const admin = __importStar(require("firebase-admin"));
const pdfkit_1 = __importDefault(require("pdfkit"));
/**
 * Generate PDF report matching the narrative template format
 */
async function generatePDFReport(snapshot, previousSnapshot, reportType, campusKey, settings) {
    const doc = new pdfkit_1.default({
        margin: 50,
        size: 'LETTER'
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    // Header
    doc.fontSize(20).font('Helvetica-Bold')
        .text('CHE Student Data Report', { align: 'center' });
    doc.moveDown();
    if (reportType === 'annual') {
        // Annual report
        const currentYear = snapshot.schoolYear;
        const previousYear = previousSnapshot?.schoolYear || 'N/A';
        doc.fontSize(14).font('Helvetica-Bold')
            .text(`${previousYear} to ${currentYear}`, { align: 'center' });
        doc.moveDown(2);
        // Calculate growth
        const currentEnrollment = snapshot.metrics.totalEnrollment;
        const previousEnrollment = previousSnapshot?.metrics.totalEnrollment || 0;
        const growth = currentEnrollment - previousEnrollment;
        const growthPercent = previousEnrollment > 0
            ? Math.round((growth / previousEnrollment) * 100)
            : 0;
        // Narrative section
        doc.fontSize(12).font('Helvetica');
        const growthDirection = growth >= 0 ? 'grew' : 'declined';
        const growthText = `Our student enrollment ${growthDirection} from ${previousEnrollment.toLocaleString()} to ${currentEnrollment.toLocaleString()} — a ${Math.abs(growthPercent)}% ${growth >= 0 ? 'increase' : 'decrease'}.`;
        doc.text(growthText);
        doc.moveDown();
        // Retention
        const m = snapshot.metrics;
        const eligibleStudents = previousSnapshot
            ? previousSnapshot.metrics.totalEnrollment - (previousSnapshot.metrics.verifiedTransfers || 0)
            : 0;
        doc.text(`${m.returningStudents.toLocaleString()} out of ${eligibleStudents.toLocaleString()} (eligible students) returned for ${currentYear}`);
        doc.text(`– Retention rate: ${m.retentionRate}%`);
        doc.moveDown();
        // Withdrawals
        doc.text(`${m.midYearWithdrawals.toLocaleString()} students withdrew during the school year.`);
        doc.moveDown();
        // Enrollment breakdown
        doc.font('Helvetica-Bold')
            .text(`${m.totalEnrollment.toLocaleString()} total students:`);
        doc.font('Helvetica')
            .text(`  ${m.newCampusGrowth.toLocaleString()} from new campuses`)
            .text(`  ${m.returningStudents.toLocaleString()} returning students`)
            .text(`  ${m.newStudentsReturningCampuses.toLocaleString()} new students in returning campuses`);
        doc.moveDown();
        // Growth breakdown
        const totalNewGrowth = m.totalNewGrowth || (m.internalGrowth + m.newCampusGrowth);
        const internalPercent = totalNewGrowth > 0
            ? Math.round((m.internalGrowth / totalNewGrowth) * 100)
            : 0;
        const newCampusPercent = totalNewGrowth > 0
            ? Math.round((m.newCampusGrowth / totalNewGrowth) * 100)
            : 0;
        doc.text(`New growth at returning campuses: ${m.internalGrowth.toLocaleString()} = ${internalPercent}% of growth`);
        doc.text(`New growth at new campuses: ${m.newCampusGrowth.toLocaleString()} = ${newCampusPercent}% of growth`);
        doc.text(`Total new growth overall: ${m.internalGrowth.toLocaleString()} + ${m.newCampusGrowth.toLocaleString()} = ${totalNewGrowth.toLocaleString()} students`);
        doc.moveDown();
        // ERBOCES projection
        const erbocesRevenue = settings.erbocesPerStudentCost * m.totalEnrollment;
        doc.font('Helvetica-Bold')
            .text(`ERBOCES Projected Revenue: $${erbocesRevenue.toLocaleString()} for ${currentYear}`);
        doc.moveDown(2);
        // Campus breakdown table
        doc.font('Helvetica-Bold')
            .text('Campus Breakdown', { underline: true });
        doc.moveDown();
        // Table header
        const tableTop = doc.y;
        const colWidths = [150, 70, 70, 70, 70];
        const cols = ['Campus', 'Enrolled', 'Returning', 'New', 'Retention'];
        doc.fontSize(10).font('Helvetica-Bold');
        let xPos = 50;
        cols.forEach((col, i) => {
            doc.text(col, xPos, tableTop, { width: colWidths[i], align: i === 0 ? 'left' : 'center' });
            xPos += colWidths[i];
        });
        doc.moveDown();
        doc.font('Helvetica');
        // Table rows (only returning campuses)
        const returningCampuses = Object.entries(snapshot.byCampus)
            .filter(([key]) => {
            // Check if this campus key exists in prior year
            return previousSnapshot?.byCampus[key] !== undefined;
        })
            .sort((a, b) => b[1].totalEnrollment - a[1].totalEnrollment);
        for (const [, campus] of returningCampuses) {
            const y = doc.y;
            xPos = 50;
            doc.text(campus.campusName, xPos, y, { width: colWidths[0] });
            xPos += colWidths[0];
            doc.text(campus.totalEnrollment.toString(), xPos, y, { width: colWidths[1], align: 'center' });
            xPos += colWidths[1];
            doc.text(campus.returningStudents.toString(), xPos, y, { width: colWidths[2], align: 'center' });
            xPos += colWidths[2];
            doc.text(campus.newStudents.toString(), xPos, y, { width: colWidths[3], align: 'center' });
            xPos += colWidths[3];
            doc.text(`${campus.retentionRate}%`, xPos, y, { width: colWidths[4], align: 'center' });
            doc.moveDown(0.5);
        }
    }
    else if (reportType === 'campus' && campusKey) {
        // Campus-specific report
        const campus = snapshot.byCampus[campusKey];
        if (!campus) {
            doc.text('Campus data not found.');
        }
        else {
            doc.fontSize(16).font('Helvetica-Bold')
                .text(campus.campusName, { align: 'center' });
            doc.fontSize(12).font('Helvetica')
                .text(`MC Leader: ${campus.mcLeader}`, { align: 'center' });
            doc.moveDown(2);
            doc.font('Helvetica-Bold').text('Metrics:');
            doc.font('Helvetica')
                .text(`Total Enrollment: ${campus.totalEnrollment}`)
                .text(`Returning Students: ${campus.returningStudents}`)
                .text(`New Students: ${campus.newStudents}`)
                .text(`Retention Rate: ${campus.retentionRate}%`)
                .text(`Non-Starters: ${campus.nonStarters}`)
                .text(`Mid-Year Withdrawals: ${campus.midYearWithdrawals}`);
        }
    }
    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica')
        .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
    doc.end();
    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise((resolve) => {
        doc.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
    });
    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `exports/reports/${snapshot.schoolYear}-${reportType}-${Date.now()}.pdf`;
    const file = bucket.file(fileName);
    await file.save(pdfBuffer, {
        metadata: {
            contentType: 'application/pdf'
        }
    });
    // Generate signed URL (expires in 1 hour)
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000
    });
    return url;
}
/**
 * Generate CSV export
 */
async function generateCSVExport(db, schoolYear, dataType) {
    let csv = '';
    switch (dataType) {
        case 'enrollment': {
            const snapshotDocs = await db.collection('snapshots')
                .where('schoolYear', '==', schoolYear)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            if (snapshotDocs.empty) {
                return 'No data available';
            }
            const snapshot = snapshotDocs.docs[0].data();
            csv = 'Campus Name,MC Leader,Total Enrollment,Returning Students,New Students,Non-Starters,Mid-Year Withdrawals,Retention Rate\n';
            for (const [, campus] of Object.entries(snapshot.byCampus)) {
                csv += `"${campus.campusName}","${campus.mcLeader}",${campus.totalEnrollment},${campus.returningStudents},${campus.newStudents},${campus.nonStarters},${campus.midYearWithdrawals},${campus.retentionRate}%\n`;
            }
            // Add totals row
            const m = snapshot.metrics;
            csv += `"TOTAL","",${m.totalEnrollment},${m.returningStudents},${m.totalNewGrowth},${m.nonStarters},${m.midYearWithdrawals},${m.retentionRate}%\n`;
            break;
        }
        case 'retention': {
            const studentDocs = await db.collection('students')
                .where('schoolYear', '==', schoolYear)
                .where('isReturningStudent', '==', true)
                .get();
            csv = 'First Name,Last Name,Campus,MC Leader,Enrollment Status,Enrolled Date\n';
            for (const doc of studentDocs.docs) {
                const s = doc.data();
                csv += `"${s.firstName}","${s.lastName}","${s.campus}","${s.mcLeader}","${s.enrollmentStatus}","${s.enrolledDate}"\n`;
            }
            break;
        }
        case 'timeline': {
            const timelineDocs = await db.collection('enrollmentTimeline')
                .where('schoolYear', '==', schoolYear)
                .orderBy('weekNumber', 'asc')
                .get();
            csv = 'Week Number,Week Start,New Enrollments,Cumulative Enrollment\n';
            for (const doc of timelineDocs.docs) {
                const week = doc.data();
                csv += `${week.weekNumber},"${week.weekStart}",${week.newEnrollments},${week.cumulativeEnrollment}\n`;
            }
            break;
        }
        case 'attendance': {
            const snapshotDocs = await db.collection('snapshots')
                .where('schoolYear', '==', schoolYear)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            if (snapshotDocs.empty) {
                return 'No data available';
            }
            const snapshot = snapshotDocs.docs[0].data();
            csv = 'Campus Name,MC Leader,Attendance Rate\n';
            for (const [, campus] of Object.entries(snapshot.byCampus)) {
                csv += `"${campus.campusName}","${campus.mcLeader}",${campus.attendanceRate}%\n`;
            }
            break;
        }
    }
    return csv;
}
//# sourceMappingURL=exports.js.map