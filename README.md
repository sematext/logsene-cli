# Logsene CLI
[Logsene](http://sematext.com/logsene) Command-line Interface  

Enables searching Logsene log entries from the command-line.
Currently supports OS X and Linux.  

## Please note
Still in Beta.

## Instalation

`git clone https://github.com/sematext/logsene-cli.git`  
`cd logsene-cli && npm install`
`npm link`

## Commands
### logsene search
```sh
Usage: logsene search query [OPTIONS]
  where OPTIONS may be:
    --q <query>        Query string (--q parameter can be omitted)
    --op AND           OPTIONAL Overrides default OR operator
    --t <interval>     OPTIONAL ISO 8601 datetime or duration or time range
    --s <size>         OPTIONAL Number of matches to return. Defaults to 200
    --o <offset>       OPTIONAL Number of matches to skip from the beginning. Defaults to 0
    --json             OPTIONAL Returns JSON instead of TSV
    --sep              OPTIONAL Sets the separator between two datetimes when specifying time range

Examples:
  logsene search
      returns last 1h of log entries

  logsene search --q ERROR
      returns last 1h of log entries that contain the term ERROR

  logsene search ERROR
      equivalent to the previous example

  logsene search UNDEFINED SEGFAULT
      returns last 1h of log entries that have either of the terms
      note: default operator is OR

  logsene search SEGFAULT Segmentation --op AND
      returns last 1h of log entries that have both terms
      note: convenience parameter --and has the same effect

  logsene search --q "Server not responding"
      returns last 1h of log entries that contain the given phrase

  logsene search --t 1y8M4d8h30m2s
      returns all the log entries reaching back to
      1 year 8 months 4 days 8 hours 30 minutes and 2 seconds
      note: any datetime component can be omitted (shown in the following two examples)
      note: months must be specified with uppercase M (distinction from minutes)

  logsene search --t 1h30m
      returns all the log entries from the last 1,5h

  logsene search --t 90
      equivalent to the previous example (default time unit is minute)

  logsene search --t 2015-06-20T20:48
      returns all the log entries that were logged after the provided datetime
      note: allowed formats listed at the bottom of this help message

  logsene search --t "2015-06-20 20:28"
      returns all the log entries that were logged after the provided datetime
      note: if a parameter contains spaces, it must be enclosed in quotes

  logsene search --t 2015-06-16T22:27:41/2015-06-18T22:27:41
      returns all the log entries that were logged between provided timestamps
      note: date range must either contain forward slash between datetimes,
            or a different range separator must be specified (shown in the next example)

  logsene search --t "2015-06-16T22:27:41 TO 2015-06-18T22:27:41" --sep " TO "
      same as previous command, except it sets the custom string separator that denotes a range
      note: default separator is the forward slash (as per ISO-8601)
      note: if a parameter contains spaces, it must be enclosed in quotes

  logsene search --t "last Friday at 13/last Friday at 13:30"
      it is also possible to use "human language" to designate datetime
      note: it may be used in place of datetime (e.g. "last friday between 12 and 14" is not allowed)
      note: may yield unpredictable datetime values

  logsene search --q ERROR --s 20
      returns at most 20 latest log entries with the term ERROR

  logsene search ERROR --s 50 --o 20
      returns chronologically sorted hits 21st to 71st (offset=20)
      note: default sort order is ascending (for convenience - latest on the bottom)

  logsene search --help
      outputs this usage information

Allowed datetime formats:
  YYYY[-]MM[-]DD[T][HH[:MM[:SS]]]
  e.g.
    YYYY-MM-DD HH:mm:ss
    YYYY-MM-DDTHH:mm
    YYYY-MM-DDHH:mm
    YYYYMMDDTHH:mm
    YYYYMMDD HH:mm
    YYYYMMDDHH:mm
    YYYYMMDDHHmm
  note: to use UTC instead of local time, append Z to datetime
  note: all datetime components are optional except date (YYYY, MM and DD)
        If not specified, component defaults to its lowest possible value
  note: date part may be separated from time by T (ISO-8601), space or nothing at all

Allowed duration format:
  [Ny][NM][Nd][Nh][Nm][Ns]
  e.g.
    1M1d42s
  note: duration is specified as a series of number and time designator pairs, e.g. 1y2M8d22h8m48s

Allowed datetime range formats
  range can be expressed in two ways, with datetime/datetime or with datetime/duration:
  datetime/datetime
  datetime/{+|-}duration
  where / is default range separator string and + or - sign is duration designator (examples listed below)
    plus  (+) duration designator means that filter's end time will be constructed by adding duration to start time
    minus (-) means that start time will be datetime - duration and end time will be what used to be start time
    YYYY[-]MM[-]DD[T][HH[:MM[:SS]]]/YYYY[-]MM[-]DD[T][HH[:MM[:SS]]]
    YYYY[-]MM[-]DD[T][HH[:MM[:SS]]]/+[Ny][NM][Nd][Nh][Nm][Ns]
  e.g.
    2015-06-23 17:45/2015-06-23 18:45
    2015-06-23 17:45/-1M
        gets translated to: 2015-05-23 17:45/2015-06-23 17:45
    2015-06-23 17:45/+15m
        gets translated to: 2015-06-23 17:45/2015-06-23 18:00
  note: all allowable datetime formats are also permitted when specifying ranges
  note: disallowed range separators:
       Y, y, M, D, d, H, h, m, S, s, -, +, P, p, T, t

Allowed "human" formats:
    10 minutes ago
    yesterday at 12:30pm
    last night (night becomes 19:00)
    last month
    last friday at 2pm
    3 hours ago
    2 weeks ago at 17
    wednesday 2 weeks ago
    2 months ago
    last week saturday morning (morning becomes 06:00)
  note: "human" format can be used instead of date-time
  note: it is not possible to express duration with "human" format (e.g. "from 2 to 3 this morining")
  note: it is recommended to avoid human format, as it may yield unexpected results
```

### logsene config get

```sh
Usage: logsene config get [OPTIONS]
  where OPTIONS may be:
    --api-key
    --app-key
    --app-name
    --range-separator (used to separate two datetimes when specifying time range)
    --trace
    --all (return listing of all params from the current user's session)
```

### logsene config set

```sh
Usage: logsene config set [OPTIONS]
  where OPTIONS may be:
    --api-key <apiKey>
    --app-key <appKey>
    --app-name <appName>
    --range-separator <sep>
    --trace <true|false>

It is not necessary to explicitly set api-key, app-key nor app-name.
logsene-cli will ask you to log in and choose Logsene application
if keys are missing from the configuration
Examples:
  logsene config set --api-key 11111111-1111-1111-1111-111111111111
      sets the api key for the current session

  logsene config set --app-key 22222222-2222-2222-2222-222222222222
      sets Logsene application key for the current session

  logsene config set --range-separator TO
      sets default separator of two datetimes for time ranges (default is /, as per ISO6801)

  logsene config set --trace [true]
      activates tracing for the current session (true can be omitted)

  logsene config set --trace false
      deactivates tracing for the current session
```
