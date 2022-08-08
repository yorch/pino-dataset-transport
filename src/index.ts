import { DataSetLogger, DataSetLoggerOptions, DEFAULT_DATASET_URL } from 'dataset-logger';
import build from 'pino-abstract-transport';

type PinoDatasetTransportOptions = {
  loggerOptions: DataSetLoggerOptions;
};

const PINO_LEVEL_TO_SEVERITY: Record<number, number> = {
  10: 1, // TRACE (considered as INFO by DataSet UI)
  20: 2, // DEBUG (considered as INFO by DataSet UI)
  30: 3, // INFO
  40: 4, // WARN
  50: 5, // ERROR
  60: 6, // FATAL
};

const defaultOpts: Partial<Omit<PinoDatasetTransportOptions, 'loggerOptions'>> & {
  loggerOptions: Partial<DataSetLoggerOptions>;
} = {
  loggerOptions: {
    serverUrl: DEFAULT_DATASET_URL,
  },
};

export default function (options: PinoDatasetTransportOptions) {
  const { loggerOptions } = {
    ...defaultOpts,
    ...options,
  };

  const logger = new DataSetLogger(loggerOptions);

  return build(
    async function (source) {
      for await (const obj of source) {
        const { time, level, msg, err, error, stack, ...props } = obj;
        const { message: errMessage, stack: errStack, ...errorProps } = err || error || {};
        logger.log({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          ts: new Date(time).getTime() * 1_000_000, // To nanoseconds
          // sev: level / 10,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          sev: PINO_LEVEL_TO_SEVERITY[level],
          attrs: { message: msg || errMessage, ...errorProps, ...props },
          // exception: stack || errStack,
        });
      }
    },
    {
      async close(error) {
        await logger.close();
        console.log('Closed', error);
      },
    }
  );
}
