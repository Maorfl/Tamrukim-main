import mongoose, { Document, Schema } from 'mongoose';

export interface IHistory extends Document {
    caseNumber: string;
    licenseIds: string[];
    createdAt: Date;
    fileName: string;
    filePath?: string; // Path to the saved merged PDF
}

const HistorySchema: Schema = new Schema(
    {
        caseNumber: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        licenseIds: {
            type: [String],
            required: true
        },
        fileName: {
            type: String,
            required: true
        },
        filePath: {
            type: String,
            required: false
        }
    },
    {
        timestamps: true
    }
);

// Index for efficient querying
HistorySchema.index({ createdAt: -1 });

export default mongoose.model<IHistory>('History', HistorySchema);
