import mongoose from 'mongoose';

const FormFieldSchema = new mongoose.Schema({
  index: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  label: {
    type: String
  },
  flags: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const FormTemplateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  fields: [FormFieldSchema],
  softDelete: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const FormTemplate = mongoose.model('FormTemplate', FormTemplateSchema);

export default FormTemplate;
