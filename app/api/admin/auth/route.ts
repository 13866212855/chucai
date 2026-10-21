import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Verify admin credentials strictly
    if (username === 'admin' && password === 'admin123') {
      const response = NextResponse.json({
        success: true,
        user: {
          username: 'admin',
          displayName: '系统管理员',
          role: '超级管理员',
        },
        token: `admin_session_${Date.now()}_auth_valid`,
      });

      // Set cookie for persistence
      response.cookies.set({
        name: 'admin_session_auth',
        value: 'authenticated',
        httpOnly: false,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: '账号或密码不正确，请核对后重试' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || '登录验证服务异常' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('admin_session_auth');
  const authHeader = req.headers.get('authorization');

  if (cookie?.value === 'authenticated' || authHeader?.includes('admin_session_')) {
    return NextResponse.json({
      success: true,
      user: {
        username: 'admin',
        displayName: '系统管理员',
        role: '超级管理员',
      },
    });
  }

  return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: '已安全退出' });
  response.cookies.delete('admin_session_auth');
  return response;
}
