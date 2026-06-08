import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const { recipientId, text } = await request.json();

    console.log(`Sending message to ${recipientId} in team ${teamId}: ${text}`);

    // Mock DB insert
    const message = {
      id: "msg_123",
      teamId,
      recipientId,
      text,
      sentAt: new Date().toISOString()
    };

    return NextResponse.json({ success: true, message });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
