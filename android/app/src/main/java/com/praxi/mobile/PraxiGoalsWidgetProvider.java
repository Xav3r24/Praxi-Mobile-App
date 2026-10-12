package com.praxi.mobile;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * "Praxi Daily" home-screen widget.
 *
 * Shows a live snapshot of today's daily-goals progress plus the
 * Rhapsody status. The values come from a small JSON blob the web
 * layer mirrors into SharedPreferences whenever goals or Rhapsody
 * change (widgets cannot read the webview's localStorage), so the
 * card is always in step with the app.
 */
public class PraxiGoalsWidgetProvider extends AppWidgetProvider {

    /** Re-render every installed Daily widget. */
    public static void refreshAll(Context ctx) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(ctx);
            ComponentName component =
                    new ComponentName(ctx, PraxiGoalsWidgetProvider.class);
            int[] ids = manager.getAppWidgetIds(component);
            for (int id : ids) {
                render(ctx, manager, id);
            }
        } catch (Exception ignored) {
            // No widgets installed yet; nothing to do.
        }
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            render(ctx, manager, id);
        }
    }

    public static String getMirroredData(Context ctx) {
        try {
            SharedPreferences prefs =
                    ctx.getSharedPreferences(MainActivity.WIDGET_DATA_PREFS, Context.MODE_PRIVATE);
            return prefs.getString(MainActivity.KEY_WIDGET_DATA, null);
        } catch (Exception e) {
            return null;
        }
    }

    private static void render(Context ctx, AppWidgetManager manager, int widgetId) {
        RemoteViews views =
                new RemoteViews(ctx.getPackageName(), R.layout.praxi_widget_goals);

        int done = 0;
        int total = 0;
        String date = null;
        boolean rhapsodyRead = false;
        int streak = 0;

        String json = getMirroredData(ctx);
        if (json != null) {
            try {
                JSONObject o = new JSONObject(json);
                done = o.optInt("goalsDone", 0);
                total = o.optInt("goalsTotal", 0);
                date = o.optString("goalsToday", null);
                rhapsodyRead = o.optBoolean("rhapsodyRead", false);
                streak = o.optInt("rhapsodyStreak", 0);
            } catch (Exception ignored) {
                // Fall back to the empty defaults below.
            }
        }

        if (done < 0) done = 0;
        if (total < 0) total = 0;
        if (streak < 0) streak = 0;

        views.setTextViewText(R.id.widget_goals_count,
                "Daily goals \u00b7 " + done + " / " + total + " done");

        String rhapsodyText = rhapsodyRead
                ? "Rhapsody \u00b7 Read \u2713"
                : "Rhapsody \u00b7 Not read yet";
        if (streak > 0) {
            rhapsodyText += " \u00b7 " + streak + "-day streak";
        }
        views.setTextViewText(R.id.widget_goals_rhapsody, rhapsodyText);

        if (date != null && !date.isEmpty()) {
            views.setTextViewText(R.id.widget_goals_date, formatDate(date));
        } else {
            views.setTextViewText(R.id.widget_goals_date, "Today");
        }

        // Tapping the card opens Daily Goals.
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra("praxi_route", "daily-goals");
        PendingIntent pending = PendingIntent.getActivity(
                ctx,
                42,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_goals_root, pending);

        manager.updateAppWidget(widgetId, views);
    }

    /** Turns YYYY-MM-DD into a short friendly label. */
    private static String formatDate(String iso) {
        try {
            String[] parts = iso.split("-");
            if (parts.length != 3) {
                return iso;
            }
            String[] months = {
                    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            };
            int month = Integer.parseInt(parts[1]);
            if (month < 1 || month > 12) {
                return iso;
            }
            return months[month - 1] + " " + Integer.parseInt(parts[2]);
        } catch (Exception e) {
            return iso;
        }
    }
}