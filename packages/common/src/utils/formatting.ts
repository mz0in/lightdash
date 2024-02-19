import moment, { MomentInput } from 'moment';
import {
    CompactOrAlias,
    CustomDimension,
    CustomFormat,
    CustomFormatType,
    DimensionType,
    Field,
    findCompactConfig,
    Format,
    isDimension,
    isTableCalculation,
    MetricType,
    NumberSeparator,
    TableCalculation,
} from '../types/field';
import { AdditionalMetric, hasFormatOptions } from '../types/metricQuery';
import { TimeFrames } from '../types/timeFrames';
import assertUnreachable from './assertUnreachable';

export const currencies = [
    'USD',
    'EUR',
    'GBP',
    'JPY',
    'CHF',
    'CAD',
    'AUD',
    'CNY',
    'ARS',
    'BRL',
    'CLP',
    'COP',
    'CZK',
    'DKK',
    'HKD',
    'HUF',
    'INR',
    'ILS',
    'KRW',
    'MYR',
    'MXN',
    'MAD',
    'NZD',
    'NOK',
    'PHP',
    'PLN',
    'RUB',
    'SAR',
    'SGD',
    'ZAR',
    'SEK',
    'TWD',
    'THB',
    'TRY',
    'VND',
];

export const formatBoolean = <T>(v: T) =>
    ['True', 'true', 'yes', 'Yes', '1', 'T'].includes(`${v}`)
        ? 'True'
        : 'False';

export const getDateFormat = (
    timeInterval: TimeFrames | undefined = TimeFrames.DAY,
): string => {
    switch (timeInterval) {
        case TimeFrames.YEAR:
            return 'YYYY';
        case TimeFrames.QUARTER:
            return 'YYYY-[Q]Q';
        case TimeFrames.MONTH:
            return 'YYYY-MM';
        default:
            return 'YYYY-MM-DD';
    }
};

const getTimeFormat = (
    timeInterval: TimeFrames | undefined = TimeFrames.DAY,
): string => {
    let timeFormat: string;
    switch (timeInterval) {
        case TimeFrames.HOUR:
            timeFormat = 'HH';
            break;
        case TimeFrames.MINUTE:
            timeFormat = 'HH:mm';
            break;
        case TimeFrames.SECOND:
            timeFormat = 'HH:mm:ss';
            break;
        default:
            timeFormat = 'HH:mm:ss:SSS';
            break;
    }
    return `YYYY-MM-DD, ${timeFormat} (Z)`;
};

export const isMomentInput = (value: unknown): value is MomentInput =>
    typeof value === 'string' ||
    typeof value === 'number' ||
    value instanceof Date ||
    value instanceof moment;

export function formatDate(
    date: MomentInput,
    timeInterval: TimeFrames = TimeFrames.DAY,
    convertToUTC: boolean = false,
): string {
    const momentDate = convertToUTC ? moment(date).utc() : moment(date);
    return momentDate.format(getDateFormat(timeInterval));
}

export function formatTimestamp(
    value: MomentInput,
    timeInterval: TimeFrames | undefined = TimeFrames.MILLISECOND,
    convertToUTC: boolean = false,
): string {
    const momentDate = convertToUTC ? moment(value).utc() : moment(value);
    return momentDate.format(getTimeFormat(timeInterval));
}

export const parseDate = (
    str: string,
    timeInterval: TimeFrames | undefined = TimeFrames.DAY,
): Date => moment(str, getDateFormat(timeInterval)).toDate();

export const parseTimestamp = (
    str: string,
    timeInterval: TimeFrames | undefined = TimeFrames.MILLISECOND,
): Date => moment(str, getTimeFormat(timeInterval)).toDate();

function getFormatNumberOptions(value: number, format?: CustomFormat) {
    const hasCurrency =
        format?.type === CustomFormatType.CURRENCY && format?.currency;
    const currencyOptions = hasCurrency
        ? { style: 'currency', currency: format.currency }
        : {};

    const round = format?.round;

    if (round === undefined) {
        // When round is not defined, keep up to 3 decimal places
        return hasCurrency ? currencyOptions : {};
    }

    if (round < 0) {
        return {
            maximumSignificantDigits: Math.max(
                Math.floor(value).toString().length + round,
                1,
            ),
            maximumFractionDigits: 0,
            ...currencyOptions,
        };
    }

    const fractionDigits = Math.min(round, 20);
    return {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
        ...currencyOptions,
    };
}

export function valueIsNaN(value: unknown) {
    if (typeof value === 'boolean') return true;

    return Number.isNaN(Number(value));
}

export function isNumber(value: unknown): value is number {
    return !valueIsNaN(value);
}

export function formatNumberValue(
    value: number,
    format?: CustomFormat,
): string {
    const options = getFormatNumberOptions(value, format);
    const separator = format?.separator || NumberSeparator.DEFAULT;

    switch (separator) {
        case NumberSeparator.COMMA_PERIOD:
            return value.toLocaleString('en-US', options);
        case NumberSeparator.SPACE_PERIOD:
            return value.toLocaleString('en-US', options).replace(/,/g, ' ');
        case NumberSeparator.PERIOD_COMMA:
            // If currency is provided, having a PERIOD_COMMA separator will also change the position of the currency symbol
            return value.toLocaleString('de-DE', options);
        case NumberSeparator.NO_SEPARATOR_PERIOD:
            return value.toLocaleString('en-US', {
                ...options,
                useGrouping: false,
            });
        case NumberSeparator.DEFAULT:
            // This will apply the default style for each currency
            return value.toLocaleString(undefined, options);
        default:
            return assertUnreachable(separator, 'Unknown separator');
    }
}

function applyDefaultFormat(value: unknown) {
    if (value === null) return '∅';
    if (value === undefined) return '-';
    if (!isNumber(value)) {
        return `${value}`;
    }

    return formatNumberValue(value);
}

export function getCustomFormatFromLegacy({
    format,
    compact,
    round,
}: {
    format?: Format;
    compact?: CompactOrAlias;
    round?: number;
}): CustomFormat {
    switch (format) {
        case Format.EUR:
        case Format.GBP:
        case Format.USD:
            return {
                type: CustomFormatType.CURRENCY,
                currency: format.toUpperCase(),
                compact,
                round,
            };
        case Format.KM:
        case Format.MI:
            return {
                type: CustomFormatType.NUMBER,
                suffix: ` ${format}`,
                compact,
                round,
            };
        case Format.PERCENT:
            return {
                type: CustomFormatType.PERCENT,
                compact,
                round,
            };
        case Format.ID:
            return {
                type: CustomFormatType.ID,
            };
        default:
            return {
                type: CustomFormatType.NUMBER,
                round,
                compact,
            };
    }
}

export function getCustomFormat(
    item:
        | Field
        | AdditionalMetric
        | TableCalculation
        | CustomDimension
        | undefined,
) {
    if (!item) return undefined;

    if (hasFormatOptions(item)) {
        return item.formatOptions;
    }

    if (isTableCalculation(item)) {
        return item.format;
    }

    // This converts legacy format type (which is Format), to CustomFormat
    return getCustomFormatFromLegacy({
        ...('format' in item && { format: item.format }),
        ...('compact' in item && { compact: item.compact }),
        ...('round' in item && { round: item.round }),
    });
}

function applyCompact(
    value: unknown,
    format?: CustomFormat,
): {
    compactValue: number;
    compactSuffix: string;
} {
    if (format?.compact === undefined)
        return { compactValue: Number(value), compactSuffix: '' };

    const compactConfig = findCompactConfig(format.compact);

    if (compactConfig) {
        const compactValue = compactConfig.convertFn(Number(value));
        const compactSuffix = format.compact ? compactConfig.suffix : '';

        return { compactValue, compactSuffix };
    }

    return { compactValue: Number(value), compactSuffix: '' };
}

export function applyCustomFormat(
    value: unknown,
    format?: CustomFormat | undefined,
): string {
    if (format?.type === undefined) return applyDefaultFormat(value);

    if (value === '') return '';

    if (value instanceof Date) {
        return formatTimestamp(value, undefined, false);
    }

    if (valueIsNaN(value) || value === null) {
        return applyDefaultFormat(value);
    }

    switch (format.type) {
        case CustomFormatType.ID:
            return `${value}`;
        case CustomFormatType.DEFAULT:
            return applyDefaultFormat(value);

        case CustomFormatType.PERCENT:
            const formatted = formatNumberValue(Number(value) * 100, format);
            return `${formatted}%`;
        case CustomFormatType.CURRENCY:
            const { compactValue, compactSuffix } = applyCompact(value, format);

            const currencyFormatted = formatNumberValue(
                compactValue,
                format,
            ).replace(/\u00A0/, ' ');

            return `${currencyFormatted}${compactSuffix}`;
        case CustomFormatType.NUMBER:
            const prefix = format.prefix || '';
            const suffix = format.suffix || '';
            const {
                compactValue: compactNumber,
                compactSuffix: compactNumberSuffix,
            } = applyCompact(value, format);

            const numberFormatted = formatNumberValue(compactNumber, format);

            return `${prefix}${numberFormatted}${compactNumberSuffix}${suffix}`;
        default:
            return assertUnreachable(
                format.type,
                `Table calculation format type ${format.type} is not valid`,
            );
    }
}

export function formatItemValue(
    item:
        | Field
        | AdditionalMetric
        | TableCalculation
        | CustomDimension
        | undefined,
    value: unknown,
    convertToUTC?: boolean,
): string {
    if (value === null) return '∅';
    if (value === undefined) return '-';

    if (item) {
        if ('type' in item) {
            switch (item.type) {
                case DimensionType.STRING:
                case MetricType.STRING:
                    return `${value}`;
                case DimensionType.BOOLEAN:
                case MetricType.BOOLEAN:
                    return formatBoolean(value);
                case DimensionType.DATE:
                case MetricType.DATE:
                    return isMomentInput(value)
                        ? formatDate(
                              value,
                              isDimension(item) ? item.timeInterval : undefined,
                              convertToUTC,
                          )
                        : 'NaT';
                case DimensionType.TIMESTAMP:
                case MetricType.TIMESTAMP:
                    return isMomentInput(value)
                        ? formatTimestamp(
                              value,
                              isDimension(item) ? item.timeInterval : undefined,
                              convertToUTC,
                          )
                        : 'NaT';
                case MetricType.MAX:
                case MetricType.MIN:
                    if (value instanceof Date) {
                        return formatTimestamp(
                            value,
                            isDimension(item) ? item.timeInterval : undefined,
                            convertToUTC,
                        );
                    }
                    break;
                default:
            }
        }

        const customFormat = getCustomFormat(item);
        return applyCustomFormat(value, customFormat);
    }

    return applyDefaultFormat(value);
}
