import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import Mustache from 'mustache';
import us from 'underscore';

const SRC_BASE = 'src';
const DEST_BASE = 'build';
const config: Profile[] = require('./profileconfig.json');

compile();

interface Profile {
    buildProfile: string;
    mainTemplate: string;
    subTemplate: string | null;
    backendUrl: string;
}

function compile() {
    const PAGES = ['start', 'confirm', 'error', 'success'];
    const myConfig = config.find(i => i.buildProfile == process.env.PROFILE)
    if (myConfig == null) {
        throw Error("No profile specified! Use from / add to profileconfig.json to proceed!")
    }
    console.log(`Compiling for profile ${myConfig.buildProfile}:`);

    const translations = prepareTranslations(myConfig);
    for (const [lang, translation] of Object.entries(translations)) {
        PAGES.forEach(page => writePage(page, lang, preparePage(page, translation)));
    }
    writeAssets(myConfig.backendUrl);
}

function writeAssets(url: string): void {
    ['fonts', 'images', 'styles'].forEach(folder => {
        fs.copySync(
            path.join(__dirname, `../${SRC_BASE}`, folder),
            path.join(__dirname, `../${DEST_BASE}`, folder)
        );
    });

    /**
     * Copy over javascript assets and replace all instances of `%CONNECTOR_DOMAIN%`
     * with an environment variable
     */
    console.log(`> Setting connector backend to ${url}`);
    const javascriptDir = path.join(__dirname, `../${SRC_BASE}`, `javascript`);
    fs.ensureDirSync(path.join(__dirname, `../${DEST_BASE}`, `javascript`));

    fs.readdirSync(javascriptDir).forEach(fileName => {
        const absolutePath = path.join(__dirname, `../${SRC_BASE}`, `javascript`, fileName);
        const file = fs.readFileSync(absolutePath, 'utf-8');
        const templated = file.replace(`%CONNECTOR_DOMAIN%`, url);

        const absoluteDestinationPath = path.join(__dirname, `../${DEST_BASE}`, `javascript`, fileName);
        fs.writeFileSync(absoluteDestinationPath, templated);
    });
}

function writePage(page: string, lang: string, output: string): void {
    fs.ensureDirSync(path.join(__dirname, `../${DEST_BASE}`, lang));
    fs.writeFileSync(pageDestPath(page, lang), output);
}

function preparePage(page: string, translation: any): string {
    const html = fs.readFileSync(pageSrcPath(page), 'utf-8');
    return Mustache.render(html, {...translation[page], ...translation.shared});
}

function pageSrcPath(page: string): string {
    return path.resolve(__dirname, `../${SRC_BASE}`, 'pages', `${page}.html`);
}

function pageDestPath(page: string, lang: string): string {
    return path.resolve(__dirname, `../${DEST_BASE}`, lang, `${page}.html`);
}

interface Template {
    language: string; // de, en, pt,...
    filename: string;
    rank: number; // 0 is the highest precedence
    mainTemplate: string;
    subTemplate: string | null; // optional
}

function prepareTranslations(profile: Profile): { [key: string]: any } {
    let files = fs.readdirSync(`${__dirname}/i18n/`)
    return us.chain(files)
        .filter(i => i.includes('.yaml'))
        .map(rawFilename => extractTemplate(rawFilename))
        .filter(template => belongsToProfile(template, profile))
        .sortBy('rank')
        .groupBy('language')
        .mapObject(lang => mergeTemplates(lang))
        .value()

    /**
     * Given a filename returns a template object containing the template specification.
     * @param filename
     */
    function extractTemplate(filename: string): Template {
        let chunks = filename.replace('.yaml', '').split('-')
        let mainTemplate, subTemplate, language: string;
        let rank
        if (chunks.length == 2) {
            [mainTemplate, language] = chunks
            rank = 0
        } else if (chunks.length == 3) {
            [mainTemplate, subTemplate, language] = chunks
            rank = 1
        } else throw Error("Wrong filename format. Required: $main-[$sub]-$lang.yaml")
        return {
            'language': language,
            'filename': filename,
            'rank': rank,
            mainTemplate: mainTemplate,
            subTemplate: subTemplate
        } as Template
    }

    /**
     * Returns true if the template file specification matches the required profile
     *
     * @param template
     * @param profile
     */
    function belongsToProfile(template: Template, profile: Profile): boolean {
        if (template.mainTemplate != profile.mainTemplate) {
            return false;
        }
        return template.subTemplate == null || template.subTemplate == profile.subTemplate;
    }

    /**
     * Merge an ordered list of one or two templates into one, the first being the main and the second the
     * optional sub template.
     *
     * @param templates
     */
    function mergeTemplates(templates: Template[]) {
        const baseTemplate = templates[0].filename
        const texts = yaml.load(fs.readFileSync(`${__dirname}/i18n/${baseTemplate}`, 'utf-8'));
        if (templates.length == 1 && templates[0].rank == 0) {
            console.log(`- ${baseTemplate}`);
            return texts;
        } else if (templates.length == 2 && templates[1].rank == 1) {
            const subTemplate = templates[1].filename;
            console.log(`- ${baseTemplate} << ${subTemplate}`);
            const subTemplateTexts = yaml.load(fs.readFileSync(`${__dirname}/i18n/${subTemplate}`, 'utf-8'));
            return mergeDeep(texts, subTemplateTexts);
        } else throw Error("Not more than one subTemplate possible.")
    }

    /**
     * Helper to merge the yaml files with lower precedence to the target with higher precedence
     *
     * @param target
     * @param sources
     */
    function mergeDeep(target: any, ...sources: any): any {
        if (!sources.length) return target;
        const source = sources.shift();

        if (isObject(target) && isObject(source)) {
            for (const key in source) {
                if (isObject(source[key])) {
                    if (!target[key]) Object.assign(target, {[key]: {}});
                    mergeDeep(target[key], source[key]);
                } else {
                    Object.assign(target, {[key]: source[key]});
                }
            }
        }

        return mergeDeep(target, ...sources);
    }

    /**
     * Helper for mergeDeep
     *
     * @param item
     */
    function isObject(item: any) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

}

