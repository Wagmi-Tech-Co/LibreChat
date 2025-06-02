import { useForm } from 'react-hook-form';
import React, { useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSetPasswordMutation } from 'librechat-data-provider/react-query';
import type { TError } from 'librechat-data-provider';
import { ErrorMessage } from '../Auth/ErrorMessage';
import { Spinner } from '~/components/svg';
import { useLocalize, ThemeContext } from '~/hooks';

interface SetPasswordForm {
  password: string;
  confirmPassword: string;
  name?: string;
}

const SetPassword: React.FC = () => {
  const navigate = useNavigate();
  const localize = useLocalize();
  const { theme } = useContext(ThemeContext);
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const {
    watch,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordForm>({ mode: 'onChange' });

  const password = watch('password');

  const setPasswordMutation = useSetPasswordMutation({
    onMutate: () => {
      setIsSubmitting(true);
      setErrorMessage('');
    },
    onSuccess: () => {
      setIsSubmitting(false);
      // Redirect to chat on successful activation
      navigate('/c/new', { replace: true });
    },
    onError: (error: unknown) => {
      setIsSubmitting(false);
      if ((error as TError).response?.data?.message) {
        setErrorMessage((error as TError).response?.data?.message ?? '');
      }
    },
  });

  const onSubmit = (data: SetPasswordForm) => {
    if (!token || !email) {
      setErrorMessage('Invalid activation link. Please request a new invitation.');
      return;
    }

    setPasswordMutation.mutate({
      token,
      email,
      password: data.password,
      name: data.name,
    });
  };

  if (!token || !email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8 p-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Invalid Invitation Link
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              This invitation link is invalid or has expired. Please contact an administrator for a new invitation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {localize('com_auth_welcome')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Set your password to activate your account
          </p>
          <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-500">
            {email}
          </p>
        </div>

        {errorMessage && (
          <ErrorMessage>
            {errorMessage}
          </ErrorMessage>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {localize('com_auth_full_name')} (Optional)
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className="relative block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:outline-none focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 sm:text-sm"
                placeholder={localize('com_auth_full_name')}
                {...register('name', {
                  maxLength: {
                    value: 80,
                    message: localize('com_auth_name_max_length'),
                  },
                })}
              />
              {errors.name && (
                <span className="mt-1 text-sm text-red-500">
                  {String(errors.name?.message)}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {localize('com_auth_password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className="relative block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:outline-none focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 sm:text-sm"
                placeholder={localize('com_auth_password')}
                {...register('password', {
                  required: localize('com_auth_password_required'),
                  minLength: {
                    value: 8,
                    message: localize('com_auth_password_min_length'),
                  },
                  maxLength: {
                    value: 128,
                    message: localize('com_auth_password_max_length'),
                  },
                })}
              />
              {errors.password && (
                <span className="mt-1 text-sm text-red-500">
                  {String(errors.password?.message)}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {localize('com_auth_password_confirm')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="relative block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:outline-none focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 sm:text-sm"
                placeholder={localize('com_auth_password_confirm')}
                {...register('confirmPassword', {
                  validate: (value: string) =>
                    value === password || localize('com_auth_password_not_match'),
                })}
              />
              {errors.confirmPassword && (
                <span className="mt-1 text-sm text-red-500">
                  {String(errors.confirmPassword?.message)}
                </span>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={Object.keys(errors).length > 0 || isSubmitting}
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
            >
              {isSubmitting ? (
                <Spinner className="h-5 w-5" />
              ) : (
                'Activate Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
