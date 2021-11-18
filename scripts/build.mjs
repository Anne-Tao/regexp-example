import FS from 'fs-extra';
import path from 'path';
import { create } from 'markdown-to-html-cli';

const deployDir = path.resolve(process.cwd(), 'web');
const mdPath = path.resolve(process.cwd(), 'README.md');
const htmlPath = path.resolve(process.cwd(), 'web', 'index.html');
const style = FS.readFileSync(path.resolve(process.cwd(), 'scripts/style.css')).toString();
const script = `
Array.from(document.getElementsByTagName('input')).forEach((elm) => {
  const code = (elm.dataset.code || '').replace(/\\n/g, '');
  elm.oninput = (evn) => {
    const isChecked = new RegExp(code).test(evn.target.value);
    elm.className = isChecked ? 'success' : 'danger';
    if (elm.nextSibling) {
      elm.nextSibling.innerHTML = isChecked ? '通过' : '×不通过'
      elm.nextSibling.className = isChecked ? 'success' : 'danger';
    }
  }
});

function copied(target) {
  target.classList.add('copied');
  target.innerHTML = '复制成功!';
  copyTextToClipboard(target.dataset.code, function() {
    setTimeout(() => {
      target.innerHTML = '点击复制';
      target.classList.remove('copied');
    }, 2000);
  });
}`;

const getRegCode = (arr = []) => arr.map(item => {
  if (item.type === 'text') {
    return item.value;
  }
  if (item.children) {
    return getRegCode(item.children);
  }
  return item
}).filter(Boolean).flat().join('');

const input = (code) => {
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: 'regex', },
    children: [
      {
        type: 'element',
        tagName: 'input',
        properties: {
          type: 'text', value: '', placeholder: '请输入下方【E.g】字符串验证实例', 'data-code': code || '',
        },
      },
      {
        type: 'element',
        tagName: 'span',
        properties: { className: 'info' },
      }
    ]
  }
}

const toolbar = (copied) => {
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: 'issue' },
    children: [
      {
        type: 'element',
        tagName: 'a',
        properties: {
          className: 'copy',
          'data-code': copied,
          onclick: 'copied(this)',
          href: 'javascript: this;'
        },
        children: [
          {
            type: 'text',
            value: '点击复制'
          }
        ]
      },
      {
        type: 'element',
        tagName: 'a',
        properties: {
          target: '__blank',
          href: `https://github.com/jaywcjlove/regexp-example/issues/new?labels=bug,enhancement&assignees=jaywcjlove&body=❌正则：~~\`${copied}\`~~&title=修改实例：xxx`
        },
        children: [
          {
            type: 'text',
            value: '🐞修改正则'
          }
        ]
      }
    ],
  }
}

const createLink = () => ([
  {
    type: 'element',
    tagName: 'a',
    properties: {
      className: 'btn create',
      target: '__blank',
      href: `https://github.com/jaywcjlove/regexp-example/issues/new?labels=new,enhancement&assignees=jaywcjlove&body=<!--新增正则实例说明-->&title=新增实例：xxx`
    },
    children: [
      {
        type: 'text',
        value: '分享例子'
      }
    ]
  },
  {
    type: 'element',
    tagName: 'a',
    properties: {
      className: ['btn', 'totop'],
      href: '#totop'
    },
    children: [
      {
        type: 'text',
        value: 'Top'
      }
    ]
  }
]);

const options = {
  'github-corners': 'https://github.com/jaywcjlove/regexp-example.git',
  document: {
    style, script,
    js: 'https://unpkg.com/@uiw/copy-to-clipboard/dist/copy-to-clipboard.umd.js',
    link: [
      // { rel: 'shortcut icon', href: './favicon.ico' },
    ]
  },
  rewrite: (node, index, parent) => {
    if (node.type === 'element' && node.tagName === 'body') {
      node.properties = { ...node.properties, id: 'totop' };
      node.children = [...createLink(), ...node.children];
    }

    if (node.tagName === 'pre' && node.properties.className) {
      const lang = Array.isArray(node.properties.className) ? node.properties.className.join('') : node.properties.className;
      if (/-regex$/.test(lang)) {
        const regCode = node.children[0];
        const regStr = getRegCode(regCode.children).replace(/\n/, '');
        // console.log('parent:', parent)
        // console.log('node:', node)
        // console.log('index:', parent[index-1])
        node.children = [ toolbar(regStr), ...node.children, input(regStr) ];
      }
    }
  }
}

;(async () => {
  await FS.ensureDir(deployDir);
  await FS.emptyDir(deployDir);
  const mdStr = (await FS.readFile(mdPath)).toString();
  const html = await create({
    ...options,
    markdown: mdStr,
    document: {
      title: "RegExp Example 正则实例大全",
      ...options.document,
      meta: [
        { description: '正则实例大全，正则表达式实例搜集，通过实例来学习正则表达式。' },
        { keywords: 'RegExp,example' }
      ]
    }
  });
  await FS.writeFile(htmlPath, html);
})();