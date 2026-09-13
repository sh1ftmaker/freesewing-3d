/* A list of all measurements used by FreeSewing */

export const topToBottomMeasurements = [
  'head',
  'neck',
  'shoulderSlope',
  'shoulderToElbow',
  'shoulderToShoulder',
  'shoulderToWrist',
  'wrist',
  'biceps',
  'hpsToBust',
  'hpsToWaistBack',
  'hpsToWaistFront',
  'highBust',
  'highBustFront',
  'chest',
  'bustFront',
  'bustPointToUnderbust',
  'bustSpan',
  'underbust',
  'waist',
  'waistBack',
  'waistToArmpit',
  'waistToFloor',
  'waistToHips',
  'waistToKnee',
  'waistToSeat',
  'waistToUnderbust',
  'waistToUpperLeg',
  'hips',
  'crossSeam',
  'crossSeamFront',
  'crotchDepth',
  'seat',
  'seatBack',
  'inseam',
  'upperLeg',
  'knee',
  'ankle',
  'heel',
]

export const measurements = topToBottomMeasurements.toSorted()

/* A list of measurments that are degrees (rather than mm) */
export const degreeMeasurements = ['shoulderSlope']

/* Helper method to determine whether a measurement uses degrees */
export const isDegreeMeasurement = (measie) => degreeMeasurements.indexOf(measie) !== -1
