import { NotificationReminder, StreakPeriod } from '../types';

export type NotificationPermissionValue = 'default' | 'granted' | 'denied';

const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;

export const isNotificationSupported = (): boolean =>
    typeof window !== 'undefined' && 'Notification' in window;

export const getNotificationPermission = (): NotificationPermissionValue => {
    if (!isNotificationSupported()) {
        return 'denied';
    }
    return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermissionValue> => {
    if (!isNotificationSupported()) {
        return 'denied';
    }
    if (Notification.permission !== 'default') {
        return Notification.permission;
    }
    try {
        const result = await Notification.requestPermission();
        return result;
    } catch (error) {
        console.error('Kon meldingspermissie niet aanvragen.', error);
        return 'denied';
    }
};

export interface ReminderNotificationOptions {
    title: string;
    body?: string;
    tag?: string;
    icon?: string;
    data?: Record<string, unknown>;
}

export const showBrowserNotification = async (
    options: ReminderNotificationOptions,
): Promise<Notification | null> => {
    if (!isNotificationSupported()) {
        return null;
    }
    if (Notification.permission !== 'granted') {
        return null;
    }
    try {
        return new Notification(options.title, {
            body: options.body,
            tag: options.tag,
            icon: options.icon,
            data: options.data,
        });
    } catch (error) {
        console.error('Kon de notificatie niet tonen.', error);
        return null;
    }
};

export const isReminderDue = (reminder: NotificationReminder): boolean => {
    const target = new Date(reminder.scheduledFor).getTime();
    return target <= Date.now();
};

export const timeUntil = (isoTimestamp: string) => {
    const target = new Date(isoTimestamp).getTime();
    const diff = target - Date.now();
    const clamped = diff < 0 ? 0 : diff;
    const hours = Math.floor(clamped / ONE_HOUR_MS);
    const minutes = Math.floor((clamped % ONE_HOUR_MS) / ONE_MINUTE_MS);
    return {
        totalMs: diff,
        hours,
        minutes,
        isPast: diff <= 0,
    };
};

export const formatTimeUntil = (isoTimestamp: string): string => {
    const { hours, minutes, isPast } = timeUntil(isoTimestamp);
    if (isPast) {
        return 'nu';
    }
    if (hours >= 1) {
        return minutes > 0 ? `${hours}u ${minutes}m` : `${hours}u`;
    }
    return `${minutes}m`;
};

export const buildStreakReminderCopy = (period: StreakPeriod, deadline: string) => {
    const label = period === 'daily' ? 'dagelijkse streak' : 'wekelijkse streak';
    const countdown = formatTimeUntil(deadline);
    return {
        title: `Let op: ${label} staat op het spel`,
        body: `Je ${label} verloopt over ${countdown}. Start een sessie om de reeks levend te houden.`,
    };
};


