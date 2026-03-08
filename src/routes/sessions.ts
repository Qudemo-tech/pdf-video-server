import { Request, Response } from 'express';
import { getSupabase } from '../lib/supabase';

/**
 * POST /api/sessions
 * Create a new video session row.
 * Body: { user_email, user_name, pdf_url?, extracted_text?, page_count?, character_count? }
 */
export async function createSessionHandler(req: Request, res: Response) {
  try {
    const {
      user_email,
      user_name,
      pdf_url,
      extracted_text,
      page_count,
      character_count,
    } = req.body;

    if (!user_email) {
      return res.status(400).json({ success: false, error: 'user_email is required' });
    }

    const { data, error } = await getSupabase()
      .from('video_sessions')
      .insert({
        user_email,
        user_name: user_name || null,
        pdf_url: pdf_url || null,
        extracted_text: extracted_text || null,
        page_count: page_count || 0,
        character_count: character_count || 0,
        current_step: 'upload',
        status: 'in_progress',
      })
      .select()
      .single();

    if (error) {
      console.error('[sessions] Create error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, session: data });
  } catch (err) {
    console.error('[sessions] Create exception:', err);
    return res.status(500).json({ success: false, error: 'Failed to create session' });
  }
}

/**
 * GET /api/sessions/:id
 * Get a single session by ID.
 */
export async function getSessionByIdHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { data, error } = await getSupabase()
      .from('video_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[sessions] Get by ID error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, session: data });
  } catch (err) {
    console.error('[sessions] Get by ID exception:', err);
    return res.status(500).json({ success: false, error: 'Failed to get session' });
  }
}

/**
 * GET /api/sessions/active?email=...
 * Get the most recent in-progress session for a user.
 */
export async function getActiveSessionHandler(req: Request, res: Response) {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, error: 'email query param is required' });
    }

    const { data, error } = await getSupabase()
      .from('video_sessions')
      .select('*')
      .eq('user_email', email)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[sessions] Get active error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, session: data });
  } catch (err) {
    console.error('[sessions] Get active exception:', err);
    return res.status(500).json({ success: false, error: 'Failed to get session' });
  }
}

/**
 * GET /api/sessions/history?email=...
 * Get all sessions for a user (most recent first).
 */
export async function getSessionHistoryHandler(req: Request, res: Response) {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, error: 'email query param is required' });
    }

    const { data, error } = await getSupabase()
      .from('video_sessions')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[sessions] History error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, sessions: data });
  } catch (err) {
    console.error('[sessions] History exception:', err);
    return res.status(500).json({ success: false, error: 'Failed to get session history' });
  }
}

/**
 * PATCH /api/sessions/:id
 * Update a session's state.
 * Body: any subset of session columns.
 */
export async function updateSessionHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    const { data, error } = await getSupabase()
      .from('video_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[sessions] Update error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, session: data });
  } catch (err) {
    console.error('[sessions] Update exception:', err);
    return res.status(500).json({ success: false, error: 'Failed to update session' });
  }
}

/**
 * DELETE /api/sessions/:id
 * Delete a session (or mark as completed).
 */
export async function deleteSessionHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { error } = await getSupabase()
      .from('video_sessions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[sessions] Delete error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[sessions] Delete exception:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
}
