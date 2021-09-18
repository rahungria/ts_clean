import path from 'path'
import fs from 'fs'


const get_root_path = () => {
    let p = path.join(path.resolve(__dirname), '..', '..')
    console.log(p)
    try {
        fs.accessSync(p, fs.constants.W_OK|fs.constants.R_OK)
    } catch (error: any) {
        console.log('NO FOUNDO')
        console.log(error)
        fs.mkdirSync(p)
    }
    return p
}

export const APP_ROOT = get_root_path()
