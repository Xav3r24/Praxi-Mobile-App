package com.praxi.mobile;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.res.AssetManager;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.Random;

/**
 * Praxi home-screen widget.
 *
 * A widescreen, thumbnail-sized card showing Praxi's icon plus the
 * message for the current time-of-day period. The message pool is
 * read straight from the same config the app uses
 * (public/config/messages.json), so the widget and the desktop-style
 * notification cadence always agree.
 */
public class PraxiWidgetProvider extends AppWidgetProvider {

    /** Re-render every installed widget (called when the in-app toggle changes). */
    public static void refreshAll(Context ctx) {
        AppWidgetManager manager = AppWidgetManager.getInstance(ctx);
        ComponentName component = new ComponentName(ctx, PraxiWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            render(ctx, manager, id);
        }
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            render(ctx, manager, id);
        }
    }

    private static String periodKey(int hour) {
        if (hour < 5) return "lateNight";
        if (hour < 12) return "morning";
        if (hour < 17) return "afternoon";
        if (hour < 21) return "evening";
        return "night";
    }

    private static String periodLabel(String key) {
        switch (key) {
            case "lateNight": return "Late night";
            case "morning": return "Morning";
            case "afternoon": return "Afternoon";
            case "evening": return "Evening";
            default: return "Night";
        }
    }

    private static String readAsset(Context ctx, String path) {
        try {
            AssetManager assets = ctx.getAssets();
            InputStream in = assets.open(path);
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append('\n');
            }
            reader.close();
            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }

    private static void render(Context ctx, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.praxi_widget);

        Calendar now = Calendar.getInstance();
        String key = periodKey(now.get(Calendar.HOUR_OF_DAY));

        String json = readAsset(ctx, "public/config/messages.json");
        JSONObject root = null;
        if (json != null) {
            try {
                root = new JSONObject(json);
            } catch (Exception ignored) {
                root = null;
            }
        }

        // Which kind of message this slot shows. Mornings carry the
        // Rhapsody reminder, afternoons the goals nudge, otherwise a
        // gentle time-of-day line.
        String kind = "time";
        if ("morning".equals(key)) {
            kind = "rhapsody";
        } else if ("afternoon".equals(key)) {
            kind = "goals";
        }

        String message = null;
        String actionLabel = null;
        String actionRoute = null;

        if ("rhapsody".equals(kind) && root != null) {
            message = pick(root.optJSONArray("rhapsody"));
            actionLabel = "Read Rhapsody";
            actionRoute = "rhapsody";
        } else if ("goals".equals(kind) && root != null) {
            JSONObject goals = root.optJSONObject("dailyGoals");
            if (goals != null) {
                message = pick(goals.optJSONArray("noGoals"));
                if (message == null) {
                    message = pick(goals.optJSONArray("firstReminder"));
                }
            }
            actionLabel = "Open Daily Goals";
            actionRoute = "daily-goals";
        }

        if (message == null && root != null) {
            JSONObject timeMessages = root.optJSONObject("timeMessages");
            if (timeMessages != null) {
                message = pick(timeMessages.optJSONArray(key));
            }
            if (message == null) {
                message = pick(root.optJSONArray("greetings"));
            }
        }

        if (message == null) {
            message = "Small steps still count.";
        }

        // Match the in-app widget preview: a per-message textured
        // background, the per-kind icon (Rhapsody logo, goals target,
        // otherwise the period's Praxi art), and the period label.
        int[] backgrounds = WIDGET_BACKGROUNDS;
        int bgIndex = hashString(message) % backgrounds.length;

        int iconRes;
        if ("rhapsody".equals(kind)) {
            iconRes = R.drawable.praxi_ror_logo;
        } else if ("goals".equals(kind)) {
            iconRes = R.drawable.praxi_target;
        } else {
            int[] art = periodArt(key);
            iconRes = art[hashString(message) % art.length];
        }

        views.setImageViewResource(R.id.widget_pet, iconRes);
        views.setInt(R.id.widget_root, "setBackgroundResource", backgrounds[bgIndex]);
        views.setTextViewText(
                R.id.widget_period,
                "PRAXI \u00b7 " + periodEmoji(key) + " " + periodLabel(key));
        views.setTextViewText(R.id.widget_message, message);

        // Tapping anywhere on the card goes to the home dashboard.
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra("praxi_route", "home");
        PendingIntent pending = PendingIntent.getActivity(
                ctx,
                0,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        // Some messages carry a button that deep-links into the app.
        if (actionLabel != null && actionRoute != null) {
            Intent actionIntent = new Intent(ctx, MainActivity.class);
            actionIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            actionIntent.putExtra("praxi_route", actionRoute);
            PendingIntent actionPending = PendingIntent.getActivity(
                    ctx,
                    actionRoute.hashCode(),
                    actionIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setTextViewText(R.id.widget_action, actionLabel);
            views.setViewVisibility(R.id.widget_action, android.view.View.VISIBLE);
            views.setOnClickPendingIntent(R.id.widget_action, actionPending);
        } else {
            views.setViewVisibility(R.id.widget_action, android.view.View.GONE);
        }

        manager.updateAppWidget(widgetId, views);
    }

    private static String pick(JSONArray pool) {
        if (pool == null || pool.length() == 0) {
            return null;
        }
        return pool.optString(new Random().nextInt(pool.length()), null);
    }

    // ---------------------------------------------------------------
    // Preview-matching look
    // ---------------------------------------------------------------

    private static final int[] WIDGET_BACKGROUNDS = {
            R.drawable.widget_bg_0,
            R.drawable.widget_bg_1,
            R.drawable.widget_bg_2,
            R.drawable.widget_bg_3,
            R.drawable.widget_bg_4,
            R.drawable.widget_bg_5
    };

    /** The same pet-art rotation the in-app preview uses. */
    private static int[] periodArt(String key) {
        switch (key) {
            case "lateNight":
                return new int[] {
                        R.drawable.praxi_deep_sleep,
                        R.drawable.praxi_night_calm
                };
            case "morning":
                return new int[] {
                        R.drawable.praxi_morning,
                        R.drawable.praxi_morning_awake,
                        R.drawable.praxi_morning_awake2
                };
            case "afternoon":
                return new int[] {
                        R.drawable.praxi_afternoon,
                        R.drawable.praxi_afternoon_focused,
                        R.drawable.praxi_afternoon_chill,
                        R.drawable.praxi_afternoon_curious
                };
            case "evening":
                return new int[] {
                        R.drawable.praxi_evening,
                        R.drawable.praxi_evening_reflective,
                        R.drawable.praxi_evening_concerned,
                        R.drawable.praxi_evening_tired
                };
            default:
                return new int[] {
                        R.drawable.praxi_night,
                        R.drawable.praxi_night_calm,
                        R.drawable.praxi_night_curious,
                        R.drawable.praxi_sleepy
                };
        }
    }

    private static String periodEmoji(String key) {
        switch (key) {
            case "lateNight": return "\uD83C\uDF19"; // 🌙
            case "morning": return "\u2600\uFE0F";   // ☀️
            case "afternoon": return "\uD83C\uDF24"; // 🌤
            case "evening": return "\uD83C\uDF06";   // 🌆
            default: return "\uD83C\uDF19";          // 🌙
        }
    }

    /** Mirrors the JS hashString() so widget and preview agree on style. */
    private static int hashString(String s) {
        if (s == null) s = "";
        int h = 0;
        for (int i = 0; i < s.length(); i++) {
            h = (h << 5) - h + s.charAt(i);
        }
        return Math.abs(h);
    }
}
