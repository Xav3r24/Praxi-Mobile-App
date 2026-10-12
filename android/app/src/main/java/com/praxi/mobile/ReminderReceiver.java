package com.praxi.mobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Fires when a Praxi reminder alarm goes off. Posts the notification
 * (unless we are inside quiet hours) and re-arms the next one.
 */
public class ReminderReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String type = intent != null
                ? intent.getStringExtra(PraxiNotifications.EXTRA_TYPE)
                : null;
        if (type == null) return;

        PraxiNotifications.onFired(context, type);
    }
}
