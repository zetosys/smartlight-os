import { SolarTimes } from '@smartlight/shared-types';

export class SolarCalculator {
  /**
   * Calculates exact astronomical solar sunrise, sunset, dawn, dusk, and solar noon.
   * Uses standard NOAA solar position algorithm.
   */
  public static calculate(
    date: Date | string,
    latitude: number,
    longitude: number,
    timezoneOffsetHours: number = 5.5, // Default IST (UTC+05:30)
  ): SolarTimes {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000) + 1;

    // Fractional year in radians
    const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);

    // Equation of time in minutes
    const eqtime =
      229.18 *
      (0.000075 +
        0.001868 * Math.cos(gamma) -
        0.032077 * Math.sin(gamma) -
        0.014615 * Math.cos(2 * gamma) -
        0.040849 * Math.sin(2 * gamma));

    // Solar declination angle in radians
    const decl =
      0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma);

    const latRad = (latitude * Math.PI) / 180;

    // Standard horizon zenith for sunrise/sunset (90.833 degrees accounts for refraction)
    const zenithStandard = (90.833 * Math.PI) / 180;
    const cosHaStandard =
      (Math.cos(zenithStandard) - Math.sin(latRad) * Math.sin(decl)) /
      (Math.cos(latRad) * Math.cos(decl));
    const clampedHaStandard = Math.max(-1, Math.min(1, cosHaStandard));
    const haStandardDeg = (Math.acos(clampedHaStandard) * 180) / Math.PI;

    // Civil twilight zenith (96.0 degrees)
    const zenithCivil = (96.0 * Math.PI) / 180;
    const cosHaCivil =
      (Math.cos(zenithCivil) - Math.sin(latRad) * Math.sin(decl)) /
      (Math.cos(latRad) * Math.cos(decl));
    const clampedHaCivil = Math.max(-1, Math.min(1, cosHaCivil));
    const haCivilDeg = (Math.acos(clampedHaCivil) * 180) / Math.PI;

    // Solar noon in UTC minutes from midnight
    const solarNoonUtcMinutes = 720 - 4 * longitude - eqtime;
    const sunriseUtcMinutes = solarNoonUtcMinutes - haStandardDeg * 4;
    const sunsetUtcMinutes = solarNoonUtcMinutes + haStandardDeg * 4;
    const dawnCivilUtcMinutes = solarNoonUtcMinutes - haCivilDeg * 4;
    const duskCivilUtcMinutes = solarNoonUtcMinutes + haCivilDeg * 4;

    const tzMinutes = timezoneOffsetHours * 60;

    const formatMinutes = (utcMinutes: number): string => {
      let localMinutes = Math.round(utcMinutes + tzMinutes);
      while (localMinutes < 0) localMinutes += 1440;
      localMinutes = localMinutes % 1440;
      const hours = Math.floor(localMinutes / 60);
      const mins = localMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const dayLengthMinutes = Math.round(haStandardDeg * 8);

    return {
      date: d.toISOString().split('T')[0],
      latitude,
      longitude,
      sunrise: formatMinutes(sunriseUtcMinutes),
      sunset: formatMinutes(sunsetUtcMinutes),
      dawnCivil: formatMinutes(dawnCivilUtcMinutes),
      duskCivil: formatMinutes(duskCivilUtcMinutes),
      solarNoon: formatMinutes(solarNoonUtcMinutes),
      dayLengthMinutes,
    };
  }
}
