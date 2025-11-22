import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    showBrowserNotification,
    isReminderDue,
    timeUntil,
    formatTimeUntil,
    buildStreakReminderCopy,
} from '../notificationUtils';
import type { NotificationReminder } from '../../types';

class NotificationMock {
    public static permission: NotificationPermission = 'default';
    public static requestPermission = vi.fn<[], Promise<NotificationPermission>>().mockResolvedValue('granted');
    public static instances: NotificationMock[] = [];

    public title: string;
    public options?: NotificationOptions;

    constructor(title: string, options?: NotificationOptions) {
        this.title = title;
        this.options = options;
        NotificationMock.instances.push(this);
    }
}

const installNotificationMock = () => {
    NotificationMock.permission = 'default';
    NotificationMock.requestPermission.mockResolvedValue('granted');
    NotificationMock.instances = [];
    vi.stubGlobal('Notification', NotificationMock as unknown as typeof Notification);
};

describe('notificationUtils', () => {
    beforeEach(() => {
        vi.useRealTimers();
        installNotificationMock();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('detecteert ondersteuning voor notificaties', () => {
        expect(isNotificationSupported()).toBe(true);
        vi.unstubAllGlobals();
        expect(isNotificationSupported()).toBe(false);
        installNotificationMock();
        expect(getNotificationPermission()).toBe('default');
    });

    it('vraagt permissie op via het Notification-API wanneer nodig', async () => {
        NotificationMock.permission = 'default';
        const result = await requestNotificationPermission();
        expect(NotificationMock.requestPermission).toHaveBeenCalled();
        expect(result).toBe('granted');
    });

    it('toont alleen een browsernotificatie wanneer permissie granted is', async () => {
        NotificationMock.permission = 'denied';
        const deniedResult = await showBrowserNotification({ title: 'Test' });
        expect(deniedResult).toBeNull();

        NotificationMock.permission = 'granted';
        const grantedResult = await showBrowserNotification({
            title: 'Reminder',
            body: 'Het is tijd om te oefenen!',
            tag: 'streak',
        });
        expect(grantedResult).not.toBeNull();
        expect(NotificationMock.instances).toHaveLength(1);
        expect(NotificationMock.instances[0].title).toBe('Reminder');
        expect(NotificationMock.instances[0].options?.tag).toBe('streak');
    });

    it('bepaalt of een reminder verschuldigd is op basis van de geplande tijd', () => {
        vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
        const overdue: NotificationReminder = {
            id: 'rem-1',
            type: 'streak-warning',
            scheduledFor: '2024-01-01T10:00:00Z',
            createdAt: '2024-01-01T09:00:00Z',
        };
        const upcoming: NotificationReminder = {
            ...overdue,
            id: 'rem-2',
            scheduledFor: '2024-01-01T14:00:00Z',
        };

        expect(isReminderDue(overdue)).toBe(true);
        expect(isReminderDue(upcoming)).toBe(false);
    });

    it('formatteert de resterende tijd tot een deadline in uren en minuten', () => {
        vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
        const twoHoursLater = formatTimeUntil('2024-01-01T14:05:00Z');
        const minutesLater = formatTimeUntil('2024-01-01T12:20:00Z');
        const past = formatTimeUntil('2023-12-31T23:59:00Z');

        expect(twoHoursLater).toBe('2u 5m');
        expect(minutesLater).toBe('20m');
        expect(past).toBe('nu');
    });

    it('bouwt streak-reminderteksten met correcte labels en countdown', () => {
        vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
        const copy = buildStreakReminderCopy('daily', '2024-01-01T13:00:00Z');

        expect(copy.title).toContain('dagelijkse streak');
        expect(copy.body).toContain('verloopt over 1u');
    });

    it('geeft ruwe tijdscomponenten terug via timeUntil', () => {
        vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
        const { hours, minutes, isPast } = timeUntil('2024-01-01T13:35:00Z');
        expect(hours).toBe(1);
        expect(minutes).toBe(35);
        expect(isPast).toBe(false);
    });
});


