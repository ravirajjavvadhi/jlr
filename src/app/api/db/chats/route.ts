import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/services/mongodb';
import Chat from '@/models/Chat';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const chats = await Chat.find({ 
      userId, 
      messages: { $exists: true, $not: { $size: 0 } } 
    }).sort({ updatedAt: -1 });
    
    return NextResponse.json({ chats });
  } catch (err: any) {
    console.error('[DB CHAT FETCH ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { chatId, userId, title, messages, model } = await req.json();

    if (!chatId || !userId) {
      return NextResponse.json({ error: 'ChatID and UserID required' }, { status: 400 });
    }

    // Atomic Upsert using Mongoose
    const result = await Chat.findOneAndUpdate(
      { id: chatId },
      { 
        userId, 
        title, 
        messages, 
        aiModel: model, 
        id: chatId // Ensure id is set if new
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, chat: result });
  } catch (err: any) {
    console.error('[DB CHAT SAVE ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });

    await Chat.deleteOne({ id: chatId });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DB CHAT DELETE ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
