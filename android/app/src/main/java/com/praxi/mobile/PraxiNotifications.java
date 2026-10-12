package com.praxi.mobile;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Random;

/**
 * Praxi's on-device reminders.
 *
 * The web layer owns the settings; this class just drains them into
 * the phone: it reads the same {@code settings} + {@code messages}
 * payload the app uses, schedules one-shot alarms for each enabled
 * reminder type, and posts a notification when one fires. Each alarm
 * re-arms the next one, so reminders keep flowing between app opens.
 *
 * Quiet hours are honoured (a fires-but-silent window), and the full
 * payload is remembered so reminders survive a reboot.
 */
public final class PraxiNotifications {

    public static final String CHANNEL_ID = "praxi_reminders";
    public static final String EXTRA_TYPE = "praxi_reminder_type";

    public static final String TYPE_BREAKS = "breaks";
    public static final String TYPE_RHAPSODY = "rhapsody";
    public static final String TYPE_GREETINGS = "greetings";
    public static final String TYPE_WORK = "work";

    // Late enough that a wrap means "start again tomorrow".
    private static final int RHAPSODY_DAY_END_HOUR = 21;

    private static final String[] ALL_TYPES = {
            TYPE_BREAKS, TYPE_RHAPSODY, TYPE_GREETINGS, TYPE_WORK
    };

    private PraxiNotifications() {
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE);
    }

    // ---------------------------------------------------------------
    // Public entry points (called from the JS bridge / receivers)
    // ---------------------------------------------------------------

    /** Parse a payload, remember it, and (re)schedule everything. */
    public static void apply(Context ctx, String payload) {
        try {
            JSONObject root = new JSONObject(payload == null ? "{}" : payload);
            prefs(ctx).edit().putString("rem_payload", payload).apply();
            schedule(
                    ctx,
                    root.optJSONObject("settings"),
                    root.optJSONObject("messages")
            );
        } catch (Exception ignored) {
            // A malformed payload just leaves the previous schedule.
        }
    }

    /** Re-apply the last payload (used after a reboot). */
    public static void rescheduleSaved(Context ctx) {
        String payload = prefs(ctx).getString("rem_payload", null);
        if (payload != null) {
            apply(ctx, payload);
        }
    }

    /** Post an immediate sample notification so the user can see it work. */
    public static void postTest(Context ctx, String payload) {
        try {
            JSONObject root = new JSONObject(payload == null ? "{}" : payload);
            JSONObject messages = root.optJSONObject("messages");
            prefs(ctx).edit()
                    .putString("rem_payload", payload)
                    .putString("rem_messages", messages == null ? "{}" : messages.toString())
                    .apply();
        } catch (Exception ignored) {
            // Fall back to whatever messages we already had.
        }
        show(
                ctx,
                "test",
                "\uD83D\uDC4B Praxi",
                "Your reminders are working. This is what a Praxi "
                        + "notification will look like.",
                "home"
        );
    }

    // ---------------------------------------------------------------
    // Scheduling
    // ---------------------------------------------------------------

    public static void schedule(Context ctx, JSONObject settings, JSONObject messages) {
        ensureChannel(ctx);
        cancelAll(ctx);

        SharedPreferences p = prefs(ctx);
        SharedPreferences.Editor e = p.edit();

        e.putString("rem_messages", messages == null ? "{}" : messages.toString());

        JSONObject reminders = settings != null ? settings.optJSONObject("reminders") : null;
        JSONObject quiet = settings != null ? settings.optJSONObject("quietHours") : null;

        int breakMin = clamp(settings != null ? settings.optInt("breakIntervalMinutes", 20) : 20, 1, 240);
        int workHrs = clamp(settings != null ? settings.optInt("workIntervalHours", 2) : 2, 1, 12);
        int rhapsHrs = clamp(settings != null ? settings.optInt("rhapsodyIntervalHours", 1) : 1, 1, 12);
        String rhapsStart = settings != null
                ? settings.optString("rhapsodyStartTime", "07:00")
                : "07:00";

        e.putBoolean("quiet_enabled", quiet != null && quiet.optBoolean("enabled", false));
        e.putString("quiet_start", quiet != null ? quiet.optString("start", "22:00") : "22:00");
        e.putString("quiet_end", quiet != null ? quiet.optString("end", "07:00") : "07:00");

        e.putString("rem_rhapsody_start", rhapsStart);
        e.putLong("rem_interval_" + TYPE_BREAKS, breakMin * 60_000L);
        e.putLong("rem_interval_" + TYPE_WORK, workHrs * 3_600_000L);
        e.putLong("rem_interval_" + TYPE_RHAPSODY, rhapsHrs * 3_600_000L);
        e.putLong("rem_interval_" + TYPE_GREETINGS, 0L);

        long now = System.currentTimeMillis();

        for (String type : ALL_TYPES) {
            boolean on = isEnabled(reminders, type);
            e.putBoolean("rem_enabled_" + type, on);

            if (!on) {
                e.remove("rem_next_" + type);
                continue;
            }

            long next;
            if (TYPE_RHAPSODY.equals(type)) {
                next = nextRhapsodyStart(now, rhapsStart);
            } else if (TYPE_GREETINGS.equals(type)) {
                next = nextGreeting(now);
            } else if (TYPE_WORK.equals(type)) {
                next = now + workHrs * 3_600_000L;
            } else {
                next = now + breakMin * 60_000L;
            }

            e.putLong("rem_next_" + type, next);
            setAlarm(ctx, type, next);
        }

        e.apply();
    }

    /** Called by {@link ReminderReceiver} when an alarm fires. */
    public static void onFired(Context ctx, String type) {
        SharedPreferences p = prefs(ctx);
        if (type == null || !p.getBoolean("rem_enabled_" + type, false)) {
            return;
        }

        long now = System.currentTimeMillis();

        if (!isQuietNow(p)) {
            post(ctx, type);
        }

        long next;
        if (TYPE_GREETINGS.equals(type)) {
            next = nextGreeting(now);
        } else if (TYPE_RHAPSODY.equals(type)) {
            long interval = p.getLong("rem_interval_" + type, 3_600_000L);
            if (interval <= 0) interval = 3_600_000L;
            next = now + interval;
            // Stop nagging overnight: wrap back to tomorrow's start.
            Calendar c = Calendar.getInstance();
            if (c.get(Calendar.HOUR_OF_DAY) >= RHAPSODY_DAY_END_HOUR) {
                next = nextRhapsodyStart(
                        now,
                        p.getString("rem_rhapsody_start", "07:00")
                );
            }
        } else {
            long interval = p.getLong("rem_interval_" + type, 0L);
            if (interval <= 0) interval = 3_600_000L;
            next = now + interval;
        }

        p.edit().putLong("rem_next_" + type, next).apply();
        setAlarm(ctx, type, next);
    }

    public static void cancelAll(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        for (String type : ALL_TYPES) {
            am.cancel(alarmIntent(ctx, type));
        }
    }

    // ---------------------------------------------------------------
    // Posting
    // ---------------------------------------------------------------

    private static void post(Context ctx, String type) {
        JSONObject messages = parseJson(prefs(ctx).getString("rem_messages", "{}"));

        String title;
        String text;
        String route = "home";

        if (TYPE_RHAPSODY.equals(type)) {
            title = "\uD83D\uDCD6 Rhapsody of Realities";
            text = pick(messages.optJSONArray("rhapsody"), "Have you read today's Rhapsody?");
            route = "rhapsody";
        } else if (TYPE_BREAKS.equals(type)) {
            title = "\u2615 Time for a break";
            text = pick(messages.optJSONArray("breaks"), "Take five. You're doing well.");
        } else if (TYPE_WORK.equals(type)) {
            title = "\uD83D\uDCBC Work check-in";
            text = pick(messages.optJSONArray("work"), "Still going? Keep at it.");
        } else {
            title = "\uD83D\uDC4B Praxi";
            text = greetingMessage(messages);
        }

        show(ctx, type, title, text, route);
    }

    private static void show(Context ctx, String type, String title, String text, String route) {
        ensureChannel(ctx);

        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra("praxi_route", route);

        PendingIntent content = PendingIntent.getActivity(
                ctx,
                requestCode(type) + 100,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(ctx, CHANNEL_ID)
                        .setSmallIcon(R.drawable.ic_praxi_notify)
                        .setContentTitle(title)
                        .setContentText(text)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                        .setAutoCancel(true)
                        .setContentIntent(content)
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        NotificationManager nm =
                (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(requestCode(type), builder.build());
        }
    }

    public static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm =
                (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Praxi reminders",
                NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription(
                "Break, Rhapsody, work and greeting reminders from Praxi.");
        channel.enableVibration(true);
        nm.createNotificationChannel(channel);
    }

    // ---------------------------------------------------------------
    // Alarms
    // ---------------------------------------------------------------

    private static void setAlarm(Context ctx, String type, long triggerAt) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        PendingIntent pi = alarmIntent(ctx, type);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S
                        || am.canScheduleExactAlarms();
                if (exact) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    return;
                }
            }
        } catch (SecurityException ignored) {
            // Exact alarms not permitted; fall through to the inexact one.
        }

        // Inexact but needs no special permission at all.
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
    }

    private static PendingIntent alarmIntent(Context ctx, String type) {
        Intent intent = new Intent(ctx, ReminderReceiver.class);
        intent.setAction("com.praxi.mobile.REMINDER");
        intent.putExtra(EXTRA_TYPE, type);
        return PendingIntent.getBroadcast(
                ctx,
                requestCode(type),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private static boolean isEnabled(JSONObject reminders, String type) {
        if (reminders == null) return false;
        Object value = reminders.opt(type);
        if (value instanceof JSONObject) {
            return ((JSONObject) value).optBoolean("enabled", false);
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return false;
    }

    private static boolean isQuietNow(SharedPreferences p) {
        if (!p.getBoolean("quiet_enabled", false)) return false;

        int[] start = parseTime(p.getString("quiet_start", "22:00"), 22, 0);
        int[] end = parseTime(p.getString("quiet_end", "07:00"), 7, 0);

        Calendar now = Calendar.getInstance();
        int nowMin = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        int startMin = start[0] * 60 + start[1];
        int endMin = end[0] * 60 + end[1];

        if (startMin == endMin) return false;
        if (startMin < endMin) return nowMin >= startMin && nowMin < endMin;
        // Wraps midnight (e.g. 22:00 -> 07:00).
        return nowMin >= startMin || nowMin < endMin;
    }

    private static long nextRhapsodyStart(long now, String start) {
        int[] hm = parseTime(start, 7, 0);
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(now);
        c.set(Calendar.HOUR_OF_DAY, hm[0]);
        c.set(Calendar.MINUTE, hm[1]);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (c.getTimeInMillis() <= now) {
            c.add(Calendar.DAY_OF_YEAR, 1);
        }
        return c.getTimeInMillis();
    }

    private static long nextGreeting(long now) {
        long best = Long.MAX_VALUE;
        int[][] slots = { { 9, 0 }, { 18, 0 } };
        for (int[] hm : slots) {
            Calendar c = Calendar.getInstance();
            c.setTimeInMillis(now);
            c.set(Calendar.HOUR_OF_DAY, hm[0]);
            c.set(Calendar.MINUTE, hm[1]);
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            if (c.getTimeInMillis() <= now) {
                c.add(Calendar.DAY_OF_YEAR, 1);
            }
            best = Math.min(best, c.getTimeInMillis());
        }
        return best;
    }

    private static String greetingMessage(JSONObject messages) {
        if (messages == null) return "Hello from Praxi. \uD83D\uDC4B";

        String key = periodKey(Calendar.getInstance().get(Calendar.HOUR_OF_DAY));
        JSONObject time = messages.optJSONObject("timeMessages");
        if (time != null) {
            String m = pick(time.optJSONArray(key), null);
            if (m != null) return m;
        }

        String g = pick(messages.optJSONArray("greetings"), null);
        return g != null ? g : "Hello from Praxi. \uD83D\uDC4B";
    }

    private static String periodKey(int hour) {
        if (hour < 5) return "lateNight";
        if (hour < 12) return "morning";
        if (hour < 17) return "afternoon";
        if (hour < 21) return "evening";
        return "night";
    }

    private static String pick(JSONArray pool, String fallback) {
        if (pool == null || pool.length() == 0) return fallback;
        return pool.optString(new Random().nextInt(pool.length()), fallback);
    }

    private static JSONObject parseJson(String json) {
        try {
            return new JSONObject(json == null ? "{}" : json);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private static int[] parseTime(String value, int defHour, int defMin) {
        try {
            String[] parts = String.valueOf(value).split(":");
            int h = Integer.parseInt(parts[0].trim());
            int m = parts.length > 1 ? Integer.parseInt(parts[1].trim()) : 0;
            return new int[] { clamp(h, 0, 23), clamp(m, 0, 59) };
        } catch (Exception e) {
            return new int[] { defHour, defMin };
        }
    }

    private static int clamp(int value, int min, int max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    private static int requestCode(String type) {
        if (TYPE_BREAKS.equals(type)) return 2001;
        if (TYPE_RHAPSODY.equals(type)) return 2002;
        if (TYPE_GREETINGS.equals(type)) return 2003;
        if (TYPE_WORK.equals(type)) return 2004;
        return 2099;
    }
}
