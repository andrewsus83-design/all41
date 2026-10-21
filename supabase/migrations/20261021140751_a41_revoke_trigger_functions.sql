-- Trigger functions cannot be called directly, but now that anon has usage on a41_private
-- (for the Storage policy helpers) none of them should be executable by anyone who does not
-- need them. Triggers keep firing: the privilege is only checked when a trigger is created.
-- (create_photo_settings, stamp_photo_approval and the photo and raffle functions were
-- revoked in the migrations that created them.)

revoke execute on function
  a41_private.add_creator_as_owner(),
  a41_private.enforce_event_rules(),
  a41_private.enforce_guest_capacity(),
  a41_private.enforce_publish_rules(),
  a41_private.guard_hunt_mission(),
  a41_private.guard_quiz(),
  a41_private.guard_quiz_question(),
  a41_private.guard_raffle_prize(),
  a41_private.mark_guest_checked_in(),
  a41_private.mark_guest_rsvp(),
  a41_private.remember_guest_status(),
  a41_private.restore_guest_status(),
  a41_private.set_updated_at()
from public;
