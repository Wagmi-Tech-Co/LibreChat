const mongoose = require('mongoose');

const emailWhitelistSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      default: '',
      maxlength: 500,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
emailWhitelistSchema.index({ email: 1, status: 1 });
emailWhitelistSchema.index({ status: 1, requestedAt: 1 });

const EmailWhitelist = mongoose.model('EmailWhitelist', emailWhitelistSchema);

module.exports = EmailWhitelist;
