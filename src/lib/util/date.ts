export const activateTill = (plusYears = 25) => {
    const date = new Date
    let years = date.getFullYear()
    years += plusYears
    date.setFullYear(years)
    return date.toISOString().slice(0, 10)
}

export const delay = (t = 100) => new Promise((yep) => setTimeout(() => yep(true), t))

