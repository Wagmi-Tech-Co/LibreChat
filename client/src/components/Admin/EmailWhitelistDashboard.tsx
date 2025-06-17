import React, { useState } from 'react';
import { useLocalize } from '~/hooks';
import {
  useGetEmailWhitelistRequestsQuery,
  useReviewEmailWhitelistMutation,
  useDeleteEmailWhitelistMutation,
} from '~/data-provider/EmailWhitelist';
import type { TEmailWhitelistRequest, TReviewEmailWhitelistRequest } from 'librechat-data-provider';

interface EmailWhitelistDashboardProps {
  className?: string;
}

const EmailWhitelistDashboard: React.FC<EmailWhitelistDashboardProps> = ({
  className = '',
}) => {
  const localize = useLocalize();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<TEmailWhitelistRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [sendInvitation, setSendInvitation] = useState(true);

  const limit = 10;

  // Query for email whitelist requests
  const {
    data: requestsData,
    isLoading,
    error,
    refetch,
  } = useGetEmailWhitelistRequestsQuery(statusFilter, currentPage, limit);

  // Mutations
  const reviewMutation = useReviewEmailWhitelistMutation();
  const deleteMutation = useDeleteEmailWhitelistMutation();

  const handleReview = (request: TEmailWhitelistRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes('');
    setSendInvitation(true); // Default to sending invitation
    setShowReviewModal(true);
  };

  const handleSubmitReview = () => {
    if (!selectedRequest) return;

    const payload: TReviewEmailWhitelistRequest = {
      action: reviewAction,
      notes: reviewNotes.trim(),
      sendInvitation: reviewAction === 'approve' ? sendInvitation : undefined, // Only send invitation for approvals
    };

    reviewMutation.mutate(
      { requestId: selectedRequest._id, payload },
      {
        onSuccess: () => {
          setShowReviewModal(false);
          setSelectedRequest(null);
          setReviewNotes('');
          setSendInvitation(true);
          refetch();
        },
        onError: (error: any) => {
          console.error('Error reviewing request:', error);
        },
      }
    );
  };

  const handleDelete = (requestId: string) => {
    if (window.confirm(localize('com_admin_email_whitelist_delete_confirm'))) {
      deleteMutation.mutate(requestId, {
        onSuccess: () => {
          refetch();
        },
        onError: (error: any) => {
          console.error('Error deleting request:', error);
        },
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex px-2 text-xs font-semibold rounded-full';
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-md bg-red-50 p-4 ${className}`}>
        <div className="text-sm text-red-700">
          {localize('com_admin_email_whitelist_error_loading')}
        </div>
      </div>
    );
  }

  const requests = requestsData?.data?.requests || [];
  const total = requestsData?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          {localize('com_admin_email_whitelist_title')}
        </h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          {localize('com_admin_email_whitelist_description')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
            {localize('com_admin_email_whitelist_filter_status')}
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">{localize('com_admin_email_whitelist_filter_all')}</option>
            <option value="pending">{localize('com_admin_email_whitelist_status_pending')}</option>
            <option value="approved">{localize('com_admin_email_whitelist_status_approved')}</option>
            <option value="rejected">{localize('com_admin_email_whitelist_status_rejected')}</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {localize('com_ui_refresh')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {localize('com_admin_email_whitelist_stat_total')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">{total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m13 0H4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {localize('com_admin_email_whitelist_no_requests')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {localize('com_admin_email_whitelist_no_requests_description')}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-md max-h-96 overflow-y-auto">
            <ul className="divide-y divide-gray-200">
              {requests.map((request) => (
                <li key={request._id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <span className={getStatusBadge(request.status)}>
                            {localize(`com_admin_email_whitelist_status_${request.status}`)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {request.email}
                          </p>
                          <p className="text-sm text-gray-500">
                            {localize('com_admin_email_whitelist_requested_at')}: {formatDate(request.requestedAt)}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">{localize('com_admin_email_whitelist_reason')}:</span> {request.reason}
                            </p>
                          )}
                          {request.reviewedAt && request.reviewedBy && (
                            <p className="text-sm text-gray-500 mt-1">
                              {localize('com_admin_email_whitelist_reviewed_by')}: {request.reviewedBy.name} ({formatDate(request.reviewedAt)})
                            </p>
                          )}
                          {request.notes && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">{localize('com_admin_email_whitelist_admin_notes')}:</span> {request.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReview(request, 'approve')}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            {localize('com_admin_email_whitelist_approve')}
                          </button>
                          <button
                            onClick={() => handleReview(request, 'reject')}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            {localize('com_admin_email_whitelist_reject')}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(request._id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {localize('com_ui_delete')}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {localize('com_ui_previous')}
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {localize('com_ui_next')}
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    {localize('com_ui_showing')} <span className="font-medium">{((currentPage - 1) * limit) + 1}</span> {localize('com_ui_to')}{' '}
                    <span className="font-medium">{Math.min(currentPage * limit, total)}</span> {localize('com_ui_of')}{' '}
                    <span className="font-medium">{total}</span> {localize('com_ui_results')}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">{localize('com_ui_previous')}</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {/* Page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">{localize('com_ui_next')}</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {reviewAction === 'approve' 
                  ? localize('com_admin_email_whitelist_approve_request')
                  : localize('com_admin_email_whitelist_reject_request')
                }
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {localize('com_admin_email_whitelist_request_email')}: <span className="font-medium">{selectedRequest.email}</span>
              </p>
              <div className="mb-4">
                <label htmlFor="review-notes" className="block text-sm font-medium text-gray-700">
                  {localize('com_admin_email_whitelist_admin_notes')} {localize('com_ui_optional')}
                </label>
                <textarea
                  id="review-notes"
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder={localize('com_admin_email_whitelist_notes_placeholder')}
                />
              </div>
              {reviewAction === 'approve' && (
                <div className="mb-4">
                  <div className="flex items-center">
                    <input
                      id="send-invitation"
                      type="checkbox"
                      checked={sendInvitation}
                      onChange={(e) => setSendInvitation(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="send-invitation" className="ml-2 block text-sm text-gray-900">
                      {localize('com_admin_email_whitelist_send_invitation')}
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {localize('com_admin_email_whitelist_send_invitation_description')}
                  </p>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {localize('com_ui_cancel')}
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewMutation.isLoading}
                  className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    reviewAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {reviewMutation.isLoading
                    ? localize('com_ui_submitting')
                    : reviewAction === 'approve'
                    ? localize('com_admin_email_whitelist_approve')
                    : localize('com_admin_email_whitelist_reject')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailWhitelistDashboard;
