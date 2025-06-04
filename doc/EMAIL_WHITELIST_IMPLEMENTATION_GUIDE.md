# Email Whitelist System Implementation Guide

## Overview

This document provides a comprehensive guide for implementing the email whitelist system in LibreChat, replacing the domain whitelist system with individual email approval functionality. The system allows users to request access directly from the login page and provides admin functionality for reviewing and managing these requests.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Backend Changes](#backend-changes)
3. [Frontend Changes](#frontend-changes)
4. [Database Schema](#database-schema)
5. [Configuration](#configuration)
6. [Deployment Instructions](#deployment-instructions)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

## System Architecture

### Flow Diagram

```
User Request Flow:
1. User visits login page during private beta
2. User sees "Request Access" option
3. User submits email and optional reason
4. System creates pending whitelist request
5. Admin reviews and approves/rejects request
6. User can login once approved

Admin Management Flow:
1. Admin accesses admin dashboard
2. Views pending/all whitelist requests
3. Reviews request details
4. Approves or rejects with optional notes
5. System sends notification (future enhancement)
```

### Components

- **Database Layer**: MongoDB model for email whitelist requests
- **Service Layer**: Business logic for email whitelist operations
- **API Layer**: RESTful endpoints for CRUD operations
- **Frontend Components**: UI for request submission and admin management
- **Middleware**: Authentication and authorization checks

## Backend Changes

### 1. Database Model

**File**: `/api/models/EmailWhitelist.js` *(NEW)*

```javascript
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
    reason: {
      type: String,
      maxlength: 500,
      trim: true,
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
    notes: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
emailWhitelistSchema.index({ status: 1, requestedAt: -1 });
emailWhitelistSchema.index({ email: 1, status: 1 });

const EmailWhitelist = mongoose.model('EmailWhitelist', emailWhitelistSchema);

module.exports = EmailWhitelist;
```

**Purpose**: 
- Stores email whitelist requests with approval workflow
- Tracks request status, timestamps, and admin review information
- Optimized with indexes for efficient querying

### 2. Service Layer

**File**: `/api/server/services/emailWhitelist.js` *(NEW)*

```javascript
const EmailWhitelist = require('~/models/EmailWhitelist');
const { logger } = require('~/config');

/**
 * Check if an email is whitelisted and approved
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function isEmailWhitelisted(email) {
  try {
    if (!email) {
      return false;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const whitelist = await EmailWhitelist.findOne({
      email: normalizedEmail,
      status: 'approved',
    });

    return !!whitelist;
  } catch (error) {
    logger.error('[isEmailWhitelisted] Error checking email whitelist:', error);
    return false;
  }
}

/**
 * Request email to be added to whitelist
 * @param {string} email
 * @param {string} reason - Optional reason for the request
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
async function requestEmailWhitelist(email, reason = '') {
  try {
    if (!email) {
      return {
        success: false,
        message: 'Email is required',
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if request already exists
    const existingRequest = await EmailWhitelist.findOne({
      email: normalizedEmail,
    });

    if (existingRequest) {
      if (existingRequest.status === 'approved') {
        return {
          success: false,
          message: 'Email is already approved',
        };
      } else if (existingRequest.status === 'pending') {
        return {
          success: false,
          message: 'Request already submitted and pending review',
        };
      } else if (existingRequest.status === 'rejected') {
        return {
          success: false,
          message: 'Previous request was rejected. Please contact support.',
        };
      }
    }

    // Create new whitelist request
    const whitelistRequest = new EmailWhitelist({
      email: normalizedEmail,
      reason: reason || '',
      status: 'pending',
      requestedAt: new Date(),
    });

    const savedRequest = await whitelistRequest.save();
    logger.info(`[requestEmailWhitelist] New email whitelist request: ${normalizedEmail}`);

    return {
      success: true,
      message: 'Whitelist request submitted successfully',
      data: savedRequest,
    };
  } catch (error) {
    logger.error('[requestEmailWhitelist] Error creating email whitelist request:', error);
    return {
      success: false,
      message: 'Failed to submit whitelist request',
    };
  }
}

/**
 * Get email whitelist requests (admin only)
 * @param {string} status - Filter by status (optional)
 * @param {number} page - Page number for pagination
 * @param {number} limit - Items per page
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */
async function getEmailWhitelistRequests(status = null, page = 1, limit = 10) {
  try {
    const query = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      EmailWhitelist.find(query)
        .populate('reviewedBy', 'name email')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailWhitelist.countDocuments(query),
    ]);

    return {
      success: true,
      data: {
        requests,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('[getEmailWhitelistRequests] Error fetching email whitelist requests:', error);
    return {
      success: false,
      message: 'Failed to fetch whitelist requests',
    };
  }
}

/**
 * Review email whitelist request (admin only)
 * @param {string} requestId
 * @param {string} action - 'approve' or 'reject'
 * @param {string} adminId - ID of the admin making the decision
 * @param {string} notes - Optional notes
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
async function reviewEmailWhitelistRequest(requestId, action, adminId, notes = '') {
  try {
    if (!['approve', 'reject'].includes(action)) {
      return {
        success: false,
        message: 'Invalid action. Must be approve or reject',
      };
    }

    const request = await EmailWhitelist.findById(requestId);
    if (!request) {
      return {
        success: false,
        message: 'Whitelist request not found',
      };
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        message: `Request has already been ${request.status}`,
      };
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    const updatedRequest = await EmailWhitelist.findByIdAndUpdate(
      requestId,
      {
        status,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        notes: notes || '',
      },
      { new: true }
    ).populate('reviewedBy', 'name email');

    logger.info(`[reviewEmailWhitelistRequest] Email whitelist request ${status}: ${request.email} by admin ${adminId}`);

    return {
      success: true,
      message: `Request ${status} successfully`,
      data: updatedRequest,
    };
  } catch (error) {
    logger.error('[reviewEmailWhitelistRequest] Error reviewing email whitelist request:', error);
    return {
      success: false,
      message: 'Failed to review whitelist request',
    };
  }
}

/**
 * Delete email whitelist request (admin only)
 * @param {string} requestId
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function deleteEmailWhitelistRequest(requestId) {
  try {
    const request = await EmailWhitelist.findById(requestId);
    if (!request) {
      return {
        success: false,
        message: 'Whitelist request not found',
      };
    }

    await EmailWhitelist.findByIdAndDelete(requestId);
    logger.info(`[deleteEmailWhitelistRequest] Deleted email whitelist request: ${request.email}`);

    return {
      success: true,
      message: 'Whitelist request deleted successfully',
    };
  } catch (error) {
    logger.error('[deleteEmailWhitelistRequest] Error deleting email whitelist request:', error);
    return {
      success: false,
      message: 'Failed to delete whitelist request',
    };
  }
}

module.exports = {
  isEmailWhitelisted,
  requestEmailWhitelist,
  getEmailWhitelistRequests,
  reviewEmailWhitelistRequest,
  deleteEmailWhitelistRequest,
};
```

**Purpose**: 
- Provides business logic for all email whitelist operations
- Handles email validation, duplicate checking, and status management
- Includes comprehensive error handling and logging

### 3. API Routes

**File**: `/api/server/routes/emailWhitelist.js` *(NEW)*

```javascript
const express = require('express');
const { SystemRoles } = require('librechat-data-provider');
const { requireJwtAuth, checkBan } = require('~/server/middleware');
const { registerLimiter } = require('~/server/middleware/limiters');
const {
  requestEmailWhitelist,
  getEmailWhitelistRequests,
  reviewEmailWhitelistRequest,
  deleteEmailWhitelistRequest,
} = require('~/server/services/emailWhitelist');
const { logger } = require('~/config');

const router = express.Router();

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== SystemRoles.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
};

/**
 * POST /api/auth/request-whitelist
 * Request email to be added to whitelist (public endpoint)
 */
router.post('/request-whitelist', registerLimiter, async (req, res) => {
  try {
    const { email, reason } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    const result = await requestEmailWhitelist(email, reason);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('[POST /request-whitelist] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/auth/whitelist-requests
 * Get email whitelist requests (admin only)
 */
router.get('/whitelist-requests', requireJwtAuth, checkBan, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
      });
    }

    const result = await getEmailWhitelistRequests(status, pageNum, limitNum);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error('[GET /whitelist-requests] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * PUT /api/auth/whitelist-requests/:requestId
 * Review email whitelist request (admin only)
 */
router.put('/whitelist-requests/:requestId', requireJwtAuth, checkBan, requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, notes } = req.body;
    const adminId = req.user.id;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Valid action (approve/reject) is required',
      });
    }

    const result = await reviewEmailWhitelistRequest(requestId, action, adminId, notes);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('[PUT /whitelist-requests/:requestId] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/auth/whitelist-requests/:requestId
 * Delete email whitelist request (admin only)
 */
router.delete('/whitelist-requests/:requestId', requireJwtAuth, checkBan, requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;

    const result = await deleteEmailWhitelistRequest(requestId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('[DELETE /whitelist-requests/:requestId] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;
```

**Purpose**: 
- Exposes RESTful API endpoints for email whitelist operations
- Implements proper authentication and authorization
- Includes input validation and error handling

### 4. Route Integration

**File**: `/api/server/routes/auth.js` *(MODIFIED)*

**Changes Made**:
```javascript
// Added at the top with other imports
const emailWhitelistRoutes = require('./emailWhitelist');

// Added at the bottom with other route mounts
router.use('/', emailWhitelistRoutes);
```

**Purpose**: Integrates email whitelist routes with the main auth router

### 5. Middleware Updates

**File**: `/api/server/middleware/checkEmailWhitelisted.js` *(RENAMED from checkDomainAllowed.js)*

**Changes Made**:
```javascript
const { isEmailWhitelisted } = require('~/server/services/emailWhitelist');
const { logger } = require('~/config');

/**
 * Checks if the user's email is whitelisted for social login
 */
const checkEmailWhitelisted = async (req, res, next = () => {}) => {
  const email = req?.user?.email;
  if (email && !(await isEmailWhitelisted(email))) {
    logger.warn(`[checkEmailWhitelisted] Email not whitelisted: ${email}`);
    return res.status(403).json({
      message: 'Your email is not authorized for access. Please contact an administrator.',
    });
  } else {
    next();
  }
};

module.exports = checkEmailWhitelisted;
```

**Purpose**: 
- Replaced domain-based checking with individual email verification
- Maintains same interface for backward compatibility

**File**: `/api/server/middleware/index.js` *(MODIFIED)*

**Changes Made**:
```javascript
// Updated export name
const checkEmailWhitelisted = require('./checkEmailWhitelisted');

module.exports = {
  // ... other exports
  checkEmailWhitelisted, // renamed from checkDomainAllowed
  // ... other exports
};
```

### 6. Service Layer Updates

**File**: `/api/server/services/AuthService.js` *(MODIFIED)*

**Changes Made**:
```javascript
// Added import at the top
const { isEmailWhitelisted } = require('~/server/services/emailWhitelist');

// Updated registerUser function to use email whitelist
async function registerUser(user, ioverpayload) {
  // ... existing code ...
  
  // Check email whitelist instead of domain whitelist
  const privateBetaMode = isEnabled(process.env.PRIVATE_BETA_MODE);
  if (privateBetaMode && !(await isEmailWhitelisted(email))) {
    throw new Error('Email not authorized for registration during private beta');
  }
  
  // ... rest of existing code ...
}
```

**Purpose**: Integrates email whitelist checking into the user registration flow

## Frontend Changes

### 1. Type Definitions

**File**: `/packages/data-provider/src/types/auth.ts` *(NEW)*

```typescript
// Email whitelist types
export type TEmailWhitelistRequest = {
  _id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  reason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type TRequestEmailWhitelistRequest = {
  email: string;
  reason?: string;
};

export type TRequestEmailWhitelistResponse = {
  success: boolean;
  message: string;
  data?: TEmailWhitelistRequest;
};

export type TEmailWhitelistRequestsResponse = {
  success: boolean;
  data: {
    requests: TEmailWhitelistRequest[];
    total: number;
    page: number;
    limit: number;
  };
};

export type TReviewEmailWhitelistRequest = {
  action: 'approve' | 'reject';
  notes?: string;
};

export type TReviewEmailWhitelistResponse = {
  success: boolean;
  message: string;
  data?: TEmailWhitelistRequest;
};
```

**Purpose**: Provides TypeScript type definitions for all email whitelist operations

### 2. API Endpoints

**File**: `/packages/data-provider/src/api-endpoints.ts` *(MODIFIED)*

**Changes Made**:
```javascript
// Added email whitelist endpoints
export const requestEmailWhitelist = () => '/api/auth/request-whitelist';
export const getEmailWhitelistRequests = (status?: string, page?: number, limit?: number) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  const queryString = params.toString();
  return `/api/auth/whitelist-requests${queryString ? `?${queryString}` : ''}`;
};
export const reviewEmailWhitelistRequest = (requestId: string) => `/api/auth/whitelist-requests/${requestId}`;
export const deleteEmailWhitelistRequest = (requestId: string) => `/api/auth/whitelist-requests/${requestId}`;
```

**Purpose**: Defines API endpoint functions for frontend service layer

### 3. Data Service Functions

**File**: `/packages/data-provider/src/data-service.ts` *(MODIFIED)*

**Changes Made**:
```typescript
// Added import for auth types
import type * as auth from './types/auth';

// Added email whitelist service functions
export function requestEmailWhitelist(payload: auth.TRequestEmailWhitelistRequest): Promise<auth.TRequestEmailWhitelistResponse> {
  return request.post(endpoints.requestEmailWhitelist(), payload);
}

export function getEmailWhitelistRequests(
  status?: string,
  page?: number,
  limit?: number
): Promise<auth.TEmailWhitelistRequestsResponse> {
  return request.get(endpoints.getEmailWhitelistRequests(status, page, limit));
}

export function reviewEmailWhitelistRequest(
  requestId: string,
  payload: auth.TReviewEmailWhitelistRequest
): Promise<auth.TReviewEmailWhitelistResponse> {
  return request.put(endpoints.reviewEmailWhitelistRequest(requestId), payload);
}

export function deleteEmailWhitelistRequest(requestId: string): Promise<{ success: boolean; message: string }> {
  return request.delete(endpoints.deleteEmailWhitelistRequest(requestId));
}
```

**Purpose**: Provides data service functions for making API calls

### 4. React Query Hooks

**File**: `/client/src/data-provider/EmailWhitelist/queries.ts` *(NEW)*

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryObserverResult, UseMutationResult } from '@tanstack/react-query';
import type * as t from 'librechat-data-provider';
import { dataService } from 'librechat-data-provider';

// Request email whitelist mutation
export const useRequestEmailWhitelistMutation = (): UseMutationResult<
  t.TRequestEmailWhitelistResponse,
  unknown,
  t.TRequestEmailWhitelistRequest,
  unknown
> => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: t.TRequestEmailWhitelistRequest) =>
      dataService.requestEmailWhitelist(payload),
    onSuccess: () => {
      // Invalidate any related queries if needed
      queryClient.invalidateQueries({ queryKey: ['emailWhitelistRequests'] });
    },
  });
};

// Get email whitelist requests query (admin only)
export const useGetEmailWhitelistRequestsQuery = (
  status?: string,
  page?: number,
  limit?: number,
  enabled: boolean = true
): QueryObserverResult<t.TEmailWhitelistRequestsResponse> => {
  return useQuery({
    queryKey: ['emailWhitelistRequests', status, page, limit],
    queryFn: () => dataService.getEmailWhitelistRequests(status, page, limit),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Review email whitelist request mutation (admin only)
export const useReviewEmailWhitelistMutation = (): UseMutationResult<
  t.TReviewEmailWhitelistResponse,
  unknown,
  { requestId: string; payload: t.TReviewEmailWhitelistRequest },
  unknown
> => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, payload }) =>
      dataService.reviewEmailWhitelistRequest(requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailWhitelistRequests'] });
    },
  });
};

// Delete email whitelist request mutation (admin only)
export const useDeleteEmailWhitelistMutation = (): UseMutationResult<
  { success: boolean; message: string },
  unknown,
  string,
  unknown
> => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (requestId: string) =>
      dataService.deleteEmailWhitelistRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailWhitelistRequests'] });
    },
  });
};
```

**Purpose**: Provides React Query hooks for efficient data fetching and caching

### 5. Email Whitelist Request Component

**File**: `/client/src/components/Auth/EmailWhitelistRequest.tsx` *(NEW)*

```tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocalize } from '~/hooks';
import { useRequestEmailWhitelistMutation } from '~/data-provider/EmailWhitelist';
import type { TRequestEmailWhitelistRequest } from 'librechat-data-provider';

interface EmailWhitelistRequestProps {
  onClose?: () => void;
  className?: string;
}

const EmailWhitelistRequest: React.FC<EmailWhitelistRequestProps> = ({
  onClose,
  className = '',
}) => {
  const localize = useLocalize();
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TRequestEmailWhitelistRequest>();

  const requestWhitelistMutation = useRequestEmailWhitelistMutation();

  const onSubmit = (data: TRequestEmailWhitelistRequest) => {
    setErrorMessage('');
    
    requestWhitelistMutation.mutate(data, {
      onSuccess: (response) => {
        if (response.success) {
          setShowSuccess(true);
          reset();
        } else {
          setErrorMessage(response.message || 'Failed to submit request');
        }
      },
      onError: (error: any) => {
        setErrorMessage(
          error?.response?.data?.message ||
          error?.message ||
          'An error occurred while submitting your request'
        );
      },
    });
  };

  if (showSuccess) {
    return (
      <div className={`rounded-lg bg-green-50 p-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.22a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              {localize('com_auth_email_whitelist_success_title')}
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>{localize('com_auth_email_whitelist_success_message')}</p>
            </div>
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccess(false);
                    if (onClose) onClose();
                  }}
                  className="rounded-md bg-green-50 px-2 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
                >
                  {localize('com_ui_close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {localize('com_auth_email_whitelist_request_title')}
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          {localize('com_auth_email_whitelist_request_description')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            {localize('com_auth_email')}
          </label>
          <div className="mt-1">
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', {
                required: localize('com_auth_email_required'),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: localize('com_auth_email_pattern'),
                },
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder={localize('com_auth_email_placeholder')}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
            {localize('com_auth_email_whitelist_reason')} {localize('com_ui_optional')}
          </label>
          <div className="mt-1">
            <textarea
              id="reason"
              rows={3}
              {...register('reason')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder={localize('com_auth_email_whitelist_reason_placeholder')}
            />
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {localize('com_ui_cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={requestWhitelistMutation.isLoading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {requestWhitelistMutation.isLoading
              ? localize('com_ui_submitting')
              : localize('com_ui_submit')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailWhitelistRequest;
```

**Purpose**: 
- Provides user interface for submitting email whitelist requests
- Includes form validation and error handling
- Shows success/error states with appropriate messaging

### 6. Login Component Integration

**File**: `/client/src/components/Auth/Login.tsx` *(MODIFIED)*

**Changes Made**:
```tsx
// Added imports
import EmailWhitelistRequest from './EmailWhitelistRequest';

// Added state variable
const [showWhitelistRequest, setShowWhitelistRequest] = useState(false);

// Added in the JSX where private beta message is shown
{startupConfig?.interface?.privateBetaMode && (
  <div className="mt-4 text-center">
    <p className="text-sm text-gray-600">
      {localize('com_auth_private_beta_message')}
    </p>
    <button
      type="button"
      className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
      onClick={() => setShowWhitelistRequest(!showWhitelistRequest)}
    >
      {localize('com_auth_sign_up')}
    </button>
  </div>
)}

{showWhitelistRequest && (
  <div className="mt-6">
    <EmailWhitelistRequest onClose={() => setShowWhitelistRequest(false)} />
  </div>
)}
```

**Purpose**: Integrates email whitelist request functionality into the login page

### 7. Localization

**File**: `/client/src/locales/en/translation.json` *(MODIFIED)*

**Changes Made**:
```json
{
  // Added email whitelist related keys
  "com_auth_email_whitelist_request_title": "Request Access",
  "com_auth_email_whitelist_request_description": "Enter your email address to request access to this private beta. We'll review your request and notify you when approved.",
  "com_auth_email_whitelist_reason": "Reason for access",
  "com_auth_email_whitelist_reason_placeholder": "Please briefly explain why you'd like access (optional)",
  "com_auth_email_whitelist_success_title": "Request Submitted",
  "com_auth_email_whitelist_success_message": "Your access request has been submitted successfully. You'll be notified when it's reviewed.",
  "com_auth_private_beta_message": "This application is currently in private beta.",
  "com_auth_sign_up": "Request Access",
  
  // Added missing UI keys
  "com_ui_submitting": "Submitting...",
  "com_ui_optional": "(optional)",
  "com_ui_close": "Close"
}
```

**Purpose**: Provides localized text for all email whitelist UI elements

## Configuration

### Environment Variables

**File**: `.env` *(MODIFICATION REQUIRED)*

```bash
# Email Whitelist Configuration
PRIVATE_BETA_MODE=true

# Existing registration setting (can be false when using private beta)
ALLOW_REGISTRATION=false

# Email configuration (required for notifications - future enhancement)
EMAIL_FROM=your-app@domain.com
EMAIL_FROM_NAME="Your App Name"
```

**Purpose**: 
- `PRIVATE_BETA_MODE`: Enables email whitelist system
- `ALLOW_REGISTRATION`: Should be false when using private beta
- Email settings for future notification features

## Database Schema

### EmailWhitelist Collection

```javascript
{
  _id: ObjectId,           // MongoDB document ID
  email: String,           // Email address (unique, lowercase, indexed)
  status: String,          // 'pending' | 'approved' | 'rejected'
  reason: String,          // Optional reason for request
  requestedAt: Date,       // When request was submitted
  reviewedAt: Date,        // When request was reviewed (null if pending)
  reviewedBy: ObjectId,    // Admin who reviewed (ref to User)
  notes: String,           // Admin notes about decision
  createdAt: Date,         // Document creation timestamp
  updatedAt: Date          // Document last update timestamp
}

// Indexes
{ email: 1, status: 1 }    // Compound index for efficient lookups
{ status: 1, requestedAt: -1 } // For admin dashboard pagination
{ email: 1 }               // Unique index for email field
```

## Deployment Instructions

### Prerequisites

1. **Node.js**: Version 18+ required
2. **MongoDB**: Running instance with connection string
3. **npm/yarn**: Package manager
4. **Environment Variables**: Properly configured `.env` file

### Backend Deployment

1. **Install Dependencies**:
   ```bash
   cd /path/to/LibreChat
   npm install
   ```

2. **Build Data Provider Package**:
   ```bash
   cd packages/data-provider
   npm run build
   cd ../..
   ```

3. **Database Migration**:
   The EmailWhitelist model will be automatically created when first accessed. No manual migration required.

4. **Environment Configuration**:
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env file with your settings
   nano .env
   ```



### Frontend Deployment

1. **Build Frontend**:
   ```bash
   npm run frontend
   ```

2. **Start Frontend Development Server** (for development):
   ```bash
   npm run frontend:dev
   ```

3. **Production Deployment**:
   ```bash
   # Build production assets
   npm run frontend:build
   
   # Serve with your preferred web server (nginx, apache, etc.)
   # Static files will be in client/dist/
   ```

4. **Start Backend Server**:
   ```bash
   npm run backend
   ```


### Production Checklist

- [ ] Environment variables configured
- [ ] MongoDB connection working
- [ ] PRIVATE_BETA_MODE=true set
- [ ] Admin user account created
- [ ] Email configuration tested (for future notifications)
- [ ] SSL/TLS certificates configured
- [ ] Backup strategy in place
- [ ] Monitoring and logging configured

## Testing Guide

### Backend API Testing

1. **Request Email Whitelist**:
   ```bash
   curl -X POST http://localhost:3080/api/auth/request-whitelist \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "reason": "Testing the system"}'
   ```

2. **Get Whitelist Requests (Admin)**:
   ```bash
   curl -X GET http://localhost:3080/api/auth/whitelist-requests \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json"
   ```

3. **Review Request (Admin)**:
   ```bash
   curl -X PUT http://localhost:3080/api/auth/whitelist-requests/REQUEST_ID \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action": "approve", "notes": "Approved for testing"}'
   ```

### Frontend Testing

1. **Access Login Page**: Navigate to `/login`
2. **Check Private Beta Message**: Should display when `PRIVATE_BETA_MODE=true`
3. **Submit Whitelist Request**: Use the "Request Access" button
4. **Verify Success Message**: Should show confirmation after submission
5. **Admin Dashboard**: Access admin features (future enhancement)

### Integration Testing

1. **Full Workflow Test**:
   - Submit email whitelist request from login page
   - Admin approves request via API
   - User can now register/login with approved email
   - Rejected emails cannot access the system

2. **Error Handling Test**:
   - Duplicate email submissions
   - Invalid email formats
   - Unauthenticated admin access attempts
   - Database connection failures

## Troubleshooting

### Common Issues

1. **"Failed to resolve import" errors**:
   ```bash
   # Rebuild data-provider package
   cd packages/data-provider
   npm run clean
   npm run build
   cd ../..
   npm run frontend 
   npm run backend
   ```

2. **TypeScript compilation errors**:
   ```bash
   # Check for missing type definitions
   npm run type-check
   ```

3. **Database connection issues**:
   ```bash
   # Verify MongoDB connection string in .env
   # Check if MongoDB service is running
   service mongod status
   ```

4. **Email whitelist not working**:
   - Verify `PRIVATE_BETA_MODE=true` in `.env`
   - Check database for EmailWhitelist collection
   - Ensure email is approved status in database

### Logs and Debugging

1. **Backend Logs**:
   ```bash
   # Check application logs
   tail -f api/logs/debug-$(date +%Y-%m-%d).log
   
   # Check error logs
   tail -f api/logs/error-$(date +%Y-%m-%d).log
   ```

2. **Database Queries**:
   ```javascript
   // Connect to MongoDB and check whitelist data
   use librechat
   db.emailwhitelists.find().pretty()
   ```

3. **Frontend Debugging**:
   - Open browser developer tools
   - Check Network tab for API call responses
   - Check Console for JavaScript errors

### Performance Optimization

1. **Database Indexes**:
   ```javascript
   // Ensure indexes are created (auto-created by schema)
   db.emailwhitelists.getIndexes()
   ```

2. **API Rate Limiting**:
   - Monitor rate limiter effectiveness
   - Adjust limits in `/api/server/middleware/limiters/`

3. **Frontend Bundle Size**:
   ```bash
   # Analyze bundle size
   npm run analyze
   ```

## Future Enhancements



### Migration Notes

If migrating from the old domain whitelist system:

1. **Data Migration**: No automatic migration available. Existing domain rules need to be manually converted to individual email approvals.

2. **Configuration Update**: Update environment variables to use the new system.

3. **User Communication**: Notify existing users about the change and new access request process.

## Support and Maintenance

### Regular Maintenance Tasks

1. **Database Cleanup**:
   ```javascript
   // Remove old rejected requests (optional)
   db.emailwhitelists.deleteMany({
     status: 'rejected',
     createdAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
   })
   ```

2. **Log Rotation**:
   - Set up log rotation for application logs
   - Monitor disk space usage

3. **Security Updates**:
   - Regularly update dependencies
   - Monitor for security vulnerabilities

### Backup Strategy

1. **Database Backup**:
   ```bash
   # Backup email whitelist collection
   mongodump --db librechat --collection emailwhitelists --out /backup/path
   ```

2. **Configuration Backup**:
   - Back up `.env` file (without sensitive data)
   - Version control all code changes

This implementation provides a complete email whitelist system that enhances security while maintaining user-friendly access request functionality. The system is designed to be scalable, maintainable, and easily extensible for future enhancements.
