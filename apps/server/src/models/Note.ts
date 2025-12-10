import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  content: string;
  createdAt: Date;
}

const NoteSchema: Schema = new Schema({
  content: {
    type: String,
    required: [true, 'Please provide content for this note.'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
