import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name;
    if (!fileName.endsWith('.db') && !fileName.endsWith('.sqlite') && !fileName.endsWith('.sqlite3')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE', message: 'Only .db, .sqlite, and .sqlite3 files are allowed' } },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'data', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write file to data/uploads
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      data: {
        filename: fileName,
        path: `data/uploads/${fileName}`,
        size: buffer.length,
        message: `File uploaded successfully to data/uploads/${fileName}`,
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to upload file' } },
      { status: 500 }
    );
  }
}
