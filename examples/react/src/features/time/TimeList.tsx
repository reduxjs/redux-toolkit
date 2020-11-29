import * as React from 'react';
import { nanoid } from '@reduxjs/toolkit';
import { useEffect } from 'react';
import { useGetTimeQuery, usePrefetchTime } from '../../app/services/times';
import { Container } from '../common/Container';
import { useTypedSelector } from '../../app/store';
import { selectGlobalPollingEnabled, selectPollingConfigByApp } from '../polling/pollingSlice';

const timezones: Record<string, string> = {
  '-12:00': '(GMT -12:00) Eniwetok, Kwajalein',
  '-11:00': '(GMT -11:00) Midway Island, Samoa',
  '-10:00': '(GMT -10:00) Hawaii',
  '-09:50': '(GMT -9:30) Taiohae',
  '-09:00': '(GMT -9:00) Alaska',
  '-08:00': '(GMT -8:00) Pacific Time (US & Canada)',
  '-07:00': '(GMT -7:00) Mountain Time (US & Canada)',
  '-06:00': '(GMT -6:00) Central Time (US & Canada), Mexico City',
  '-05:00': '(GMT -5:00) Eastern Time (US & Canada), Bogota, Lima',
  '-04:50': '(GMT -4:30) Caracas',
  '-04:00': '(GMT -4:00) Atlantic Time (Canada), Caracas, La Paz',
  '-03:50': '(GMT -3:30) Newfoundland',
  '-03:00': '(GMT -3:00) Brazil, Buenos Aires, Georgetown',
  '-02:00': '(GMT -2:00) Mid-Atlantic',
  '-01:00': '(GMT -1:00) Azores, Cape Verde Islands',
  '+00:00': '(GMT) Western Europe Time, London, Lisbon, Casablanca',
  '+01:00': '(GMT +1:00) Brussels, Copenhagen, Madrid, Paris',
  '+02:00': '(GMT +2:00) Kaliningrad, South Africa',
  '+03:00': '(GMT +3:00) Baghdad, Riyadh, Moscow, St. Petersburg',
  '+03:50': '(GMT +3:30) Tehran',
  '+04:00': '(GMT +4:00) Abu Dhabi, Muscat, Baku, Tbilisi',
  '+04:50': '(GMT +4:30) Kabul',
  '+05:00': '(GMT +5:00) Ekaterinburg, Islamabad, Karachi, Tashkent',
  '+05:50': '(GMT +5:30) Bombay, Calcutta, Madras, New Delhi',
  '+05:75': '(GMT +5:45) Kathmandu, Pokhara',
  '+06:00': '(GMT +6:00) Almaty, Dhaka, Colombo',
  '+06:50': '(GMT +6:30) Yangon, Mandalay',
  '+07:00': '(GMT +7:00) Bangkok, Hanoi, Jakarta',
  '+08:00': '(GMT +8:00) Beijing, Perth, Singapore, Hong Kong',
  '+08:75': '(GMT +8:45) Eucla',
  '+09:00': '(GMT +9:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk',
  '+09:50': '(GMT +9:30) Adelaide, Darwin',
  '+10:00': '(GMT +10:00) Eastern Australia, Guam, Vladivostok',
  '+10:50': '(GMT +10:30) Lord Howe Island',
  '+11:00': '(GMT +11:00) Magadan, Solomon Islands, New Caledonia',
  '+11:50': '(GMT +11:30) Norfolk Island',
  '+12:00': '(GMT +12:00) Auckland, Wellington, Fiji, Kamchatka',
  '+12:75': '(GMT +12:45) Chatham Islands',
  '+13:00': '(GMT +13:00) Apia, Nukualofa',
  '+14:00': '(GMT +14:00) Line Islands, Tokelau',
};

const TimeZoneSelector = ({ onChange }: { onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void }) => {
  return (
    <select name="timezone_offset" id="timezone-offset" onChange={onChange}>
      <option value="">Select one...</option>
      {Object.entries(timezones).map(([value, description]) => (
        <option key={value} value={value}>
          {description}
        </option>
      ))}
    </select>
  );
};

const intervalOptions = [
  { label: '0 - Off', value: 0 },
  { label: '1s', value: 1000 },
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '1m', value: 60000 },
];

const TimeDisplay = ({ offset, label }: { offset: string; label: string }) => {
  const globalPolling = useTypedSelector(selectGlobalPollingEnabled);
  const { enabled: timesPolling } = useTypedSelector((state) => selectPollingConfigByApp(state, 'times'));

  const canPoll = globalPolling && timesPolling;

  const [pollingInterval, setPollingInterval] = React.useState(0);
  const { data, refetch, isFetching } = useGetTimeQuery(offset, {
    pollingInterval: canPoll ? pollingInterval : 0,
  });

  return (
    <div style={{ ...(isFetching ? { background: '#e6ffe8' } : {}) }}>
      <p>
        {data?.time && new Date(data.time).toLocaleTimeString()} - {label}
      </p>
      <p>
        <button onClick={refetch}>refetch manually</button> Polling Interval:{' '}
        <select value={pollingInterval} onChange={({ target: { value } }) => setPollingInterval(Number(value))}>
          {intervalOptions.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </p>
    </div>
  );
};

export const TimeList = () => {
  const [times, setTimes] = React.useState<{ [key: string]: string }>({
    [nanoid()]: '-08:00',
  });
  const [selectedValue, setSelectedValue] = React.useState<string>('');

  const prefetch = usePrefetchTime('getTime');

  useEffect(() => {
    setTimeout(() => {
      setTimes((prev) => ({ ...prev, [nanoid()]: '+00:00' }));
    }, 1000);
  }, []);

  return (
    <Container>
      <h3>Add some times, even duplicates, and watch them automatically refetch in sync!</h3>
      <p>
        Notes: shared queries (aka multiple entries of the same time zone) will share the lowest polling interval
        between them that is greater than 0. If all entries are set to 0, it will stop polling. If you have two entries
        with a polling time of 5s and one with 0 - off, it will continue at 5s until they are removed or 0'd out.
        <br />
        Any new poll starts after the last request has either finished or failed to prevent slow-running requests to
        immediately double-trigger.
        <br />
        <strong>* Background flashes green when query is running</strong>
        <button onMouseEnter={() => prefetch('+02:00', { force: true })}>Prefetch</button>
      </p>
      <TimeZoneSelector onChange={({ target: { value } }) => setSelectedValue(value)} />
      <button onClick={() => setTimes((prev) => ({ ...prev, [nanoid()]: selectedValue }))} disabled={!selectedValue}>
        Track time
      </button>
      <hr />
      {Object.entries(times).map(([key, tz]) => (
        <TimeDisplay key={key} offset={tz} label={timezones[tz]} />
      ))}
    </Container>
  );
};
