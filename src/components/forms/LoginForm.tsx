"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PasswordInput from "@/components/ui/PasswordInput";
import { LoginCredentials } from "@/types/auth";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { getContextAwareDefaultRoute, getDefaultProtectedRoute } from "@/lib/appAccess";

export default function LoginForm() {
  const { showToast } = useToast();
  const { setUser, setTokens, setUserContext } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>();

  const onSubmit = async (data: LoginCredentials) => {
    try {
      setIsLoading(true);

      // Step 1: Login
      const res = await api.post("/auth/login", {
        login_id: data.login_id,
        password: data.password,
      });

      const { access_token, refresh_token, user, expires_in } = res.data;

      setTokens({ access_token, refresh_token }, expires_in || 3600);

      let authUser = user;

      try {
        const userRes = await api.get("/users/me");
        authUser = userRes.data;
      } catch {
        if (user) {
          authUser = user;
        }
      }

      setUser(authUser);

      // Step 2: Get user context (organization/member info)
      let nextUserContext = null;

      try {
        const contextRes = await api.get("/auth/me/context", {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        });
        nextUserContext = contextRes.data;
        setUserContext(nextUserContext);
      } catch (contextErr) {
        console.warn("Failed to get user context:", contextErr);
        // Context is optional, continue without it
      }

      showToast("Login successful!", "success");
      window.location.href = getContextAwareDefaultRoute(authUser, nextUserContext) || getDefaultProtectedRoute(authUser);
    } catch (err: any) {
      showToast(err?.message || "Invalid credentials", "error");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Username / Email"
        type="text"
        placeholder="Enter your username or email"
        {...register("login_id", { required: "Username or Email is required" })}
        error={errors.login_id?.message}
      />

      <PasswordInput
        label="Password"
        placeholder="Enter password"
        {...register("password", { required: "Password is required" })}
        error={errors.password?.message}
      />

      <Button type="submit" className="w-full" isLoading={isLoading}>
        {isLoading ? "Please wait..." : "Sign In"}
      </Button>
    </form>
  );
}
