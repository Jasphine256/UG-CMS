import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiPaginated<T>(data: T[], total: number, page: number, limit: number) {
  return NextResponse.json({
    success: true,
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function apiUnauthorized(message = "Unauthorized") {
  return apiError(message, 401);
}

export function apiForbidden(message = "Forbidden") {
  return apiError(message, 403);
}

export function apiNotFound(message = "Not found") {
  return apiError(message, 404);
}
