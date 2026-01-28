import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { loginSchema } from '@/lib/validation/schemas';
import { safeParseBody, createErrorResponse } from '@/lib/validation/middleware';

export async function POST(request: NextRequest) {
  try {
    // Validate request body with Zod schema
    const [, validation] = await safeParseBody(request, loginSchema);
    if (!validation.success) {
      return createErrorResponse(validation);
    }

    const { username, password } = validation.data;

    const authService = getAuthService();
    await authService.initialize();

    const result = await authService.login(username, password);

    if (!result.success) {
      logger.security('Failed login attempt', { username });
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    logger.audit('User login', result.user?.id, { username });

    // Set HTTP-only cookie for the token (for web)
    const response = NextResponse.json({
      user: result.user,
      token: result.token,
      message: 'Login successful'
    });

    response.cookies.set('auth-token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error) {
    logger.error('Login API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}