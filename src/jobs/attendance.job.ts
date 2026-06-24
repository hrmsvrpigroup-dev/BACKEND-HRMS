export const runAttendanceJob = async () => {
  return {
    executedAt: new Date().toISOString(),
    status: 'noop',
  }
}

