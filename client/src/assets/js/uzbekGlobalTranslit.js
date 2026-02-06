

export function runGlobalUzbekTranslit() {
    const lang = localStorage.getItem("lang")
    if (!lang || !["uzb", "uzk"].includes(lang)) return

    const cyrToLat = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i',
        'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
        'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'ъ': '', 'ь': '',
        'э': 'e', 'ю': 'yu', 'я': 'ya', 'қ': 'q', 'ғ': 'g‘', 'ҳ': 'h', 'ў': 'o‘',

        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'J', 'З': 'Z', 'И': 'I',
        'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
        'У': 'U', 'Ф': 'F', 'Х': 'X', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
        'Қ': 'Q', 'Ғ': 'G‘', 'Ҳ': 'H', 'Ў': 'O‘'
    }

    const latToCyr = {
        'yo': 'ё', 'yu': 'ю', 'ya': 'я', 'sh': 'ш', 'ch': 'ч', 'o‘': 'ў', 'g‘': 'ғ', 'ng': 'нг',
        'a': 'а', 'b': 'б', 'd': 'д', 'e': 'е', 'f': 'ф', 'g': 'г', 'h': 'ҳ', 'i': 'и', 'j': 'ж',
        'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'q': 'қ', 'r': 'р', 's': 'с',
        't': 'т', 'u': 'у', 'v': 'в', 'x': 'х', 'y': 'й', 'z': 'з',

        'Yo': 'Ё', 'Yu': 'Ю', 'Ya': 'Я', 'Sh': 'Ш', 'Ch': 'Ч', 'O‘': 'Ў', 'G‘': 'Ғ',
        'A': 'А', 'B': 'Б', 'D': 'Д', 'E': 'Е', 'F': 'Ф', 'G': 'Г', 'H': 'Ҳ', 'I': 'И', 'J': 'Ж',
        'K': 'К', 'L': 'Л', 'M': 'М', 'N': 'Н', 'O': 'О', 'P': 'П', 'Q': 'Қ', 'R': 'Р', 'S': 'С',
        'T': 'Т', 'U': 'У', 'V': 'В', 'X': 'Х', 'Y': 'Й', 'Z': 'З'
    }


    const convert = text => {
        if (lang === "uzb") {
            return text
                .split('')
                .map(ch => cyrToLat[ch] || ch)
                .join('')
        }

        if (lang === "uzk") {
            let result = text
            Object.keys(latToCyr)
                .sort((a, b) => b.length - a.length)
                .forEach(k => {
                    result = result.replaceAll(k, latToCyr[k])
                })
            return result
        }

        return text
    }

    const skipTags = new Set([
        'SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT',
        'INPUT', 'TEXTAREA', 'SELECT', 'OPTION'
    ])

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                const parent = node.parentNode
                if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT
                if (!parent || skipTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT
                if (parent.isContentEditable) return NodeFilter.FILTER_REJECT
                return NodeFilter.FILTER_ACCEPT
            }
        }
    )

    while (walker.nextNode()) {
        walker.currentNode.nodeValue =
            convert(walker.currentNode.nodeValue)
    }
}
