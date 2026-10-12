package com.praxi.mobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Alarms do not survive a reboot, so re-apply the last known reminder
 * payload once the device finishes booting.
 */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            PraxiNotifications.rescheduleSaved(context);
        } catch (Exception ignored) {
            // Nothing scheduled yet; harmless.
        }
    }
}
