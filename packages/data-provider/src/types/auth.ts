// ...existing code...

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
  sendInvitation?: boolean;
};

export type TReviewEmailWhitelistResponse = {
  success: boolean;
  message: string;
  data?: TEmailWhitelistRequest;
};

// ...existing code...