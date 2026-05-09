import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/services/mongodb';
import SystemConfig from '@/models/SystemConfig';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const commander = searchParams.get('commander');

    if (commander !== 'ravirajjavvadi' && commander !== 'ravirajjavvadi@gmail.com') {
      return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
    }

    const configs = await SystemConfig.find({});
    return NextResponse.json({ configs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { commander, key, value } = await req.json();

    if (commander !== 'ravirajjavvadi' && commander !== 'ravirajjavvadi@gmail.com') {
      return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
    }

    await SystemConfig.findOneAndUpdate(
      { key },
      { value, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
