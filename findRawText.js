const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const searchDir = process.argv[2] || process.cwd();

function isTextComponent(name) {
    if (!name) return false;
    const textNames = ['Text', 'Animated.Text', 'TextInput', 'Button', 'GlassBadge', 'AppFooter'];
    return textNames.includes(name);
}

function getElementName(node) {
    if (node.type === 'JSXIdentifier') return node.name;
    if (node.type === 'JSXMemberExpression') {
        return getElementName(node.object) + '.' + getElementName(node.property);
    }
    return null;
}

function scanFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf-8');
    try {
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
        });

        traverse(ast, {
            JSXElement(path) {
                const elementName = getElementName(path.node.openingElement.name);
                if (isTextComponent(elementName)) {
                    path.skip(); // skip children of Text
                    return;
                }

                // Check children
                path.node.children.forEach(child => {
                    if (child.type === 'JSXText') {
                        const val = child.value;
                        if (val.trim() !== '') {
                            console.log(`[RAW TEXT] ${filePath}:${child.loc.start.line} - "${val.trim()}" in <${elementName}>`);
                        }
                    } else if (child.type === 'JSXExpressionContainer') {
                        const expr = child.expression;
                        if (expr.type === 'StringLiteral' || expr.type === 'NumericLiteral') {
                            console.log(`[LITERAL EXPR] ${filePath}:${child.loc.start.line} - ${expr.value} in <${elementName}>`);
                        } else if (expr.type === 'LogicalExpression' && expr.operator === '&&') {
                            // Check for things like number && ...
                            // This is harder to analyze statically but we can report it.
                        } else if (expr.type === 'Identifier') {
                            // string or number variables
                            // console.log(`[VAR EXPR] ${filePath}:${child.loc.start.line} - {${expr.name}} in <${elementName}>`);
                        }
                    }
                });
            }
        });
    } catch (e) {
        // console.error(`Error parsing ${filePath}:`, e.message);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                walk(fullPath);
            }
        } else if (fullPath.endsWith('.tsx')) {
            scanFile(fullPath);
        }
    }
}

walk(searchDir);
