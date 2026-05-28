export type ChatMessage = {
  id: string;
  request_id: string | null;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type ChatHeadConversation = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  messages: ChatMessage[];
  lastAt: string;
  unread: number;
  // Pokud poslední zpráva měla request_id, drží ho — nové odeslání se přivěsí na něj.
  // null = přímý chat bez kontextu poptávky.
  requestId: string | null;
};
