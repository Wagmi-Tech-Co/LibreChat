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
          // Auto close after 3 seconds
          setTimeout(() => {
            setShowSuccess(false);
            if (onClose) {
              onClose();
            }
          }, 3000);
        } else {
          setErrorMessage(response.message);
        }
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message || 
          'Failed to submit whitelist request. Please try again.';
        setErrorMessage(message);
      },
    });
  };

  if (showSuccess) {
    return (
      <div className={`rounded-md border border-green-500 bg-green-500/10 p-4 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.23a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              {localize('com_auth_email_whitelist_request_success')}
            </h3>
            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>{localize('com_auth_email_whitelist_request_success_message')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-md border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {localize('com_auth_email_whitelist_request_title')}
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {localize('com_auth_email_whitelist_request_description')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {localize('com_auth_email')}
          </label>
          <input
            {...register('email', {
              required: localize('com_auth_email_required'),
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: localize('com_auth_email_pattern'),
              },
            })}
            type="email"
            id="email"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            placeholder={localize('com_auth_email_placeholder')}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {localize('com_auth_email_whitelist_reason')} {localize('com_ui_optional')}
          </label>
          <textarea
            {...register('reason', {
              maxLength: {
                value: 500,
                message: localize('com_auth_email_whitelist_reason_max_length'),
              },
            })}
            id="reason"
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            placeholder={localize('com_auth_email_whitelist_reason_placeholder')}
          />
          {errors.reason && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.reason.message}
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="rounded-md border border-red-500 bg-red-500/10 p-3">
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
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  {errorMessage}
                </h3>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {localize('com_ui_cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={requestWhitelistMutation.isLoading}
            className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requestWhitelistMutation.isLoading
              ? localize('com_ui_submitting')
              : localize('com_auth_email_whitelist_submit')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailWhitelistRequest;
