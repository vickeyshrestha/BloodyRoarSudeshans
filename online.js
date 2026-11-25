// Supabase Online Multiplayer & High Score Manager

const OnlineManager = (() => {
  const SUPABASE_URL = 'https://fdnbohkxuhxmuvoletmg.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fecxk5etyuI8bYLWRFs5WQ_6VHgw7zT';

  let client = null;
  let channel = null;
  let hostedRoomCode = null;
  let heartbeatTimer = null;

  function getClient() {
    if (!client && window.supabase && typeof window.supabase.createClient === 'function') {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return client;
  }

  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async function fetchHighScores(limit = 12) {
    const sb = getClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from('br_high_scores')
      .select('id, player_name, fighter_id, mode, score, wins, created_at')
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.warn('High score fetch error:', error.message);
      return [];
    }
    return data || [];
  }

  async function submitHighScore({ playerName, fighterId, mode, score, wins }) {
    const sb = getClient();
    if (!sb || !playerName) return false;
    const { error } = await sb.from('br_high_scores').insert({
      player_name: playerName.slice(0, 24),
      fighter_id: fighterId,
      mode,
      score: Math.max(0, Math.round(score)),
      wins: Math.max(0, Math.round(wins))
    });
    if (error) {
      console.warn('High score insert error:', error.message);
      return false;
    }
    return true;
  }

  async function listWaitingRooms() {
    const sb = getClient();
    if (!sb) return [];
    const activeCutoff = new Date(Date.now() - 25000).toISOString();
    const { data, error } = await sb
      .from('br_rooms')
      .select('code, host_name, host_fighter, status, last_heartbeat, created_at')
      .eq('status', 'waiting')
      .gte('last_heartbeat', activeCutoff)
      .order('created_at', { ascending: false })
      .limit(8);
    if (error) return [];
    return data || [];
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  async function closeHostedRoom() {
    stopHeartbeat();
    const sb = getClient();
    if (!sb || !hostedRoomCode) return;
    const codeToClose = hostedRoomCode;
    hostedRoomCode = null;
    await sb.from('br_rooms').update({ status: 'closed' }).eq('code', codeToClose);
  }

  async function hostRoom(hostName, hostFighter) {
    const sb = getClient();
    if (!sb) throw new Error('Supabase client unavailable');
    await closeHostedRoom();
    const code = generateRoomCode();
    const nowIso = new Date().toISOString();
    const { error } = await sb.from('br_rooms').insert({
      code,
      host_name: hostName.slice(0, 20),
      host_fighter: hostFighter,
      status: 'waiting',
      last_heartbeat: nowIso
    });
    if (error) throw error;
    hostedRoomCode = code;
    heartbeatTimer = setInterval(async () => {
      if (!hostedRoomCode) return;
      await sb
        .from('br_rooms')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('code', hostedRoomCode)
        .eq('status', 'waiting');
    }, 8000);
    return code;
  }

  async function joinRoom(code, guestName, guestFighter) {
    const sb = getClient();
    if (!sb) throw new Error('Supabase client unavailable');
    const cleanCode = code.trim().toUpperCase();
    const { data: room, error: fetchErr } = await sb
      .from('br_rooms')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!room) throw new Error('Room not found');
    if (room.status !== 'waiting') throw new Error('Room is already full or finished');

    const { error: updErr } = await sb
      .from('br_rooms')
      .update({
        guest_name: guestName.slice(0, 20),
        guest_fighter: guestFighter,
        status: 'playing'
      })
      .eq('code', cleanCode);

    if (updErr) throw updErr;
    return room;
  }

  function connectChannel(
    code,
    {
      onGuestJoin,
      onRemoteInput,
      onRemoteState,
      onMatchEnd,
      onRematchRequest,
      onRematchAccept,
      onRematchDecline,
      onPeerLeave
    }
  ) {
    const sb = getClient();
    if (!sb) return null;
    disconnectChannel();

    channel = sb.channel(`br-match-${code.toUpperCase()}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'guest_join' }, ({ payload }) => {
        if (onGuestJoin) onGuestJoin(payload);
      })
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        if (onRemoteInput) onRemoteInput(payload);
      })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        if (onRemoteState) onRemoteState(payload);
      })
      .on('broadcast', { event: 'match_end' }, ({ payload }) => {
        if (onMatchEnd) onMatchEnd(payload);
      })
      .on('broadcast', { event: 'rematch_request' }, ({ payload }) => {
        if (onRematchRequest) onRematchRequest(payload);
      })
      .on('broadcast', { event: 'rematch_accept' }, () => {
        if (onRematchAccept) onRematchAccept();
      })
      .on('broadcast', { event: 'rematch_decline' }, () => {
        if (onRematchDecline) onRematchDecline();
      })
      .on('broadcast', { event: 'leave' }, () => {
        if (onPeerLeave) onPeerLeave();
      })
      .subscribe();

    return channel;
  }

  function sendBroadcast(event, payload) {
    if (!channel) return;
    channel.send({ type: 'broadcast', event, payload });
  }

  function disconnectChannel() {
    stopHeartbeat();
    const sb = getClient();
    if (channel && sb) {
      sb.removeChannel(channel);
      channel = null;
    }
  }

  return {
    fetchHighScores,
    submitHighScore,
    listWaitingRooms,
    hostRoom,
    closeHostedRoom,
    stopHeartbeat,
    joinRoom,
    connectChannel,
    sendBroadcast,
    disconnectChannel
  };
})();
