'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { RegisterData } from '@/types/auth';
import { useToast } from '@/context/ToastContext';

export default function RegisterForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterData>();
  const password = watch('password');

  const onSubmit = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      
      await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      
      showToast('Registration successful! Please login.', 'success');
      
      setTimeout(() => {
        router.push('/login');
      }, 500);
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Registration failed';
      showToast(errorMessage, 'error');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
      <Input
        label="Full Name"
        autoComplete="off"
        {...register('name', { required: 'Name is required' })}
        error={errors.name?.message}
        placeholder="Enter your full name"
      />

      <Input
        label="Email"
        type="email"
        autoComplete="off"
        {...register('email', { 
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        })}
        error={errors.email?.message}
        placeholder="Enter your email"
      />

      <Input
        label="Password"
        type="password"
        autoComplete="off"
        {...register('password', { 
          required: 'Password is required',
          minLength: {
            value: 6,
            message: 'Password must be at least 6 characters'
          }
        })}
        error={errors.password?.message}
        placeholder="Enter your password"
      />

      <Input
        label="Confirm Password"
        type="password"
        autoComplete="off"
        {...register('confirmPassword', { 
          required: 'Please confirm your password',
          validate: value => value === password || 'Passwords do not match'
        })}
        error={errors.confirmPassword?.message}
        placeholder="Confirm your password"
      />

      <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Register'}
      </Button>
    </form>
  );
}